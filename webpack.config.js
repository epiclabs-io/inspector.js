const path = require("path");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");

const PATHS = {
    entryPoint: path.resolve(__dirname, 'src/index.ts'),
    bundles: path.resolve(__dirname, 'lib'),
};

const mode = process.env.NODE_ENV || "development"
module.exports = {
    mode: mode,
    entry: {
        'inspectorjs-lib': [PATHS.entryPoint],
        'inspectorjs-lib.min': [PATHS.entryPoint]
    },
    output: {
        path: PATHS.bundles,
        filename: '[name].js',
        libraryTarget: 'umd',
        library: 'inspectorjs',
        umdNamedDefine: true
    },
    optimization: {
        minimize: mode === "production",
        minimizer: [new TerserPlugin()],
    },
    performance: {
        maxAssetSize: 300000,
        maxEntrypointSize: 300000
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: 'head',
            filename: 'samples/index.html',
            template: 'samples/index.html'
        }),
        new HtmlWebpackPlugin({
            inject: 'head',
            filename: 'samples/index_webworkers.html',
            template: 'samples/index_webworkers.html'
        })
    ],
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    devtool: 'eval',
    devServer: {
        static: {
            directory: path.join(__dirname, './'),
        },
        hot: true,
    },
    module: {
        // Webpack doesn't understand TypeScript files and a loader is needed.
        // `node_modules` folder is excluded in order to prevent problems with
        // the library dependencies, as well as `__tests__` folders that
        // contain the tests for the library
        rules: [{
            test: /\.tsx?$/,
            exclude: /node_modules/,
            use: {
                loader: 'ts-loader',
                options: {
                    // disable type checker - we will use it in fork plugin
                    transpileOnly: true
                }
            }
        }]
    }
}