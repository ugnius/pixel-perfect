const dev = process.env.NODE_ENV !== 'production'
const path = require('path')
const nodeExternals = require('webpack-node-externals')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')


const clientConfig = {
	target: 'web',
	mode: dev ? 'development' : 'production',
	devtool: dev ? 'cheap-source-map' : 'hidden-source-map',
	entry: {
		report: './src/report.js',
	},
	output: {
		path: path.resolve(__dirname, 'dist/public'),
		filename: '[name].bundle.js?v=[chunkhash]',
		publicPath: '/',
	},
	stats: 'minimal',
	resolve: {
		modules: [
			path.resolve('./src'),
			'node_modules',
		],
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: /(node_modules|bower_components)/,
				loader: 'babel-loader',
				options: {
					presets: ['@babel/preset-env', '@babel/preset-react'],
					plugins: [
						'@babel/plugin-transform-runtime',
					],
				},
			},
			{
				test: /\.scss$/,
				use: [
					{
						loader: MiniCssExtractPlugin.loader,
					},
					'css-loader',
					'sass-loader',
				],
			},
			{
				test: /\.css$/,
				use: [
					{
						loader: MiniCssExtractPlugin.loader,
					},
					'css-loader',
				],
			},
		],
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].bundle.css?v=[chunkhash]',
		}),
		new CopyWebpackPlugin([
			{ from: 'src/public', force: true },
		]),
		new HtmlWebpackPlugin({
			template: './src/report.html',
			filename: 'report.html',
		}),
	],
}

const serverConfig = {
	target: 'async-node',
	mode: dev ? 'development' : 'production',
	devtool: dev ? 'cheap-source-map' : 'source-map',
	entry: './src/server.js',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'server.bundle.js',
	},
	stats: 'minimal',
	node: {
		__dirname: false,
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: /(node_modules|bower_components)/,
				loader: 'babel-loader',
				options: {
					presets: [['@babel/preset-env', { 'targets': { 'node': 'current' } }], '@babel/preset-react'],
					plugins: [
						'@babel/plugin-transform-runtime',
					],
				},
			},
		],
	},
	externals: [
		nodeExternals(),
		function (context, request, callback) {
			if (/\/config$/.test(request)) {
				return callback(null, 'commonjs ../config')
			}
			if (request === './webpack-assets.json') {
				return callback(null, 'commonjs ./webpack-assets.json')
			}
			callback()
		},
	],
}


module.exports = [serverConfig, clientConfig]
