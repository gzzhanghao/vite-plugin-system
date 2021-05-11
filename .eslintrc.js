module.exports = {
  root: true,
  overrides: [
    {
      files: [
        '**/*.js',
      ],
      extends: [
        'eslint-config-airbnb-base',
      ],
    },
    {
      files: [
        '**/*.ts',
      ],
      extends: [
        'eslint-config-airbnb-typescript/base',
      ],
      parserOptions: {
        project: './tsconfig.json',
      },
      rules: {
        'consistent-return': 0,
        'no-restricted-syntax': 0,
        'import/no-extraneous-dependencies': 0,
        '@typescript-eslint/no-shadow': 0,
        '@typescript-eslint/no-use-before-define': 0,
      },
    },
  ],
};
