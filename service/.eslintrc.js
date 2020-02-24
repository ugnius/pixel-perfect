module.exports = {
	env: {
		es6: true,
		browser: true,
		node: true,
	},
	globals: {
		it: true,
	},
	parser: 'babel-eslint',
	parserOptions: {
		ecmaVersion: 2018,
		ecmaFeatures: {
			jsx: true,
		},
		sourceType: 'module',
	},
	settings: {
		react: {
			version: '16.8.4',
		},
	},
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:import/errors',
	],
	rules: {
		'indent': ['error', 'tab'],
		'quotes': ['error', 'single'],
		'semi': ['error', 'never'],
		'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
		'no-trailing-spaces': 'error',
		'space-before-blocks': 'error',
		'space-before-function-paren': ['error', {'anonymous': 'always', 'named': 'ignore'}],
		'keyword-spacing': ['error', { 'before': true }],
		'space-in-parens': ['error', 'never'],
		'object-curly-spacing': ['error', 'always'],
		'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
		'comma-dangle': ['error', 'always-multiline'],
		'indent': ['error', 'tab', { 'SwitchCase': 1 }],
		'eol-last': ['error'],
		'require-atomic-updates': 0,
	}
}