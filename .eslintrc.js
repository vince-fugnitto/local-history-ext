/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    extends: [
        './configs/errors.eslintrc.json'
    ],
    ignorePatterns: [
        '**/{node_modules,lib}',
        'plugins'
    ],
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: 'tsconfig.json'
    }
};
