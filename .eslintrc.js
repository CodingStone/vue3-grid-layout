module.exports = {
    parser: 'vue-eslint-parser',
    parserOptions: {
        parser: '@typescript-eslint/parser', // Specifies the ESLint parser
        ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
        sourceType: 'module', // Allows for the use of imports
        ecmaFeatures: {
            jsx: true
        }
    },
    extends: ['plugin:vue/vue3-recommended', 'plugin:@typescript-eslint/recommended', 'prettier', 'plugin:prettier/recommended'],
    settings: {
        'import/resolver': {
            alias: {
                map: [['@', './src/']]
            }
        }
    },
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'off' }
}
