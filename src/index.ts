import fs from 'fs';
import type { HtmlTagDescriptor, PluginOption, ResolvedConfig } from 'vite';
import defaultsDeep from 'lodash.defaultsdeep';
import hash from 'hash-sum';
import MagicString from 'magic-string';
import { parse, transform } from '@vue/compiler-dom';
import {
  AttributeNode,
  ElementNode,
  NodeTransform,
  NodeTypes,
  SourceLocation,
} from '@vue/compiler-core';

export interface ViteSystemPluginOptions {
  systemPath?: string;
  distPath?: string;
}

export default function viteSystemPlugin(options: ViteSystemPluginOptions = {}): PluginOption {
  const systemContent = fs.readFileSync(require.resolve(options.systemPath ?? 'systemjs/dist/s.min.js'));
  const systemAssetPath = (options.distPath ?? 'system/s.min.[hash].js').replace('[hash]', hash(systemContent));

  let config: ResolvedConfig;
  return {
    name: 'system-plugin',
    apply: 'build',

    config(config) {
      defaultsDeep(config, {
        build: {
          rollupOptions: {
            output: {},
          },
        },
      });
      const output = config.build!.rollupOptions!.output!;
      if (!Array.isArray(output)) {
        output.format = 'system';
        return;
      }
      for (const item of output) {
        item.format = 'system';
      }
    },

    configResolved(_config) {
      config = _config;
    },

    generateBundle() {
      this.emitFile({
        fileName: systemAssetPath,
        type: 'asset',
        source: systemContent,
      });
    },

    transformIndexHtml: {
      enforce: 'post',
      transform(html) {
        const s = new MagicString(html);
        const moduleScripts: ElementNode[] = [];

        traverseHtml(html, (node) => {
          if (node.type !== NodeTypes.ELEMENT) {
            return;
          }
          if (node.tag === 'script') {
            if (getAttribute(node, 'type') !== 'module') {
              return;
            }
            moduleScripts.push(node);
            removeNode(s, node);
          }
          if (node.tag === 'link') {
            if (getAttribute(node, 'rel') === 'modulepreload') {
              removeNode(s, node);
            }
          }
        });

        const preloadScripts = [
          `${config.base}${systemAssetPath}`,
          ...moduleScripts
            .map((node) => getAttribute(node, 'src'))
            .filter(Boolean),
        ];

        const preloadTags = preloadScripts.map<HtmlTagDescriptor>((href) => ({
          tag: 'link',
          attrs: { type: 'preload', as: 'script', href },
          injectTo: 'head',
        }));

        const scriptTags: HtmlTagDescriptor[] = [
          {
            tag: 'script',
            attrs: {
              src: `${config.base}${systemAssetPath}`,
            },
            injectTo: 'body',
          },
          ...moduleScripts.map<HtmlTagDescriptor>((node) => {
            let children: string | undefined;
            if (node.children[0]?.type === NodeTypes.TEXT) {
              children = node.children[0].content;
            }
            return {
              tag: 'script',
              attrs: { src: getAttribute(node, 'src') },
              children,
              injectTo: 'body',
            };
          }),
        ];

        return {
          html: s.toString(),
          tags: [...preloadTags, ...scriptTags],
        };
      },
    },
  };
}

function traverseHtml(html: string, callback: NodeTransform) {
  const ast = parse(html.replace(/<!doctype\s/i, '<!DOCTYPE '), {
    comments: true,
  });
  transform(ast, {
    nodeTransforms: [callback],
  });
}

function getAttribute(node: ElementNode, name: string) {
  const attr = node.props.find(
    (prop) => prop.name === name,
  ) as any as AttributeNode;
  if (!attr) {
    return;
  }
  return attr?.value?.content ?? true;
}

function removeNode(s: MagicString, node: { loc: SourceLocation }) {
  s.remove(node.loc.start.offset, node.loc.end.offset);
}
