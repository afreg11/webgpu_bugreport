const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const {CleanWebpackPlugin} = require("clean-webpack-plugin");
var ProgressBarPlugin = require("progress-bar-webpack-plugin");
// const OptimizeCssAssetWebpackPlugin = require('optimize-css-assets-webpack-plugin');
// const TerserWebpackPlugin = require("terser-webpack-plugin");

const toCopy = [
    ["./node_modules/mocha/mocha.js", "./mocha"],
    ["./node_modules/mocha/mocha.css", "./mocha"],
    ["./node_modules/plotly.js-dist-min/plotly.min.js", "./plotly.js-dist-min/"],
];

/**
 *
 * @param rootPath
 * @param outPath
 * @param entry
 * @param settings
 */
function generateConfig(rootPath, outPath, entry, settings=null) {
    let jsIn = entry?.js?.in ? entry.js.in: "build_entry.js";
    let jsOut =  entry?.js?.out ? entry.js.out : "bundle.js";

    let plugins = [
        new ProgressBarPlugin()
    ];

    if (entry?.html?.in) {
        plugins.push(
            new HtmlWebpackPlugin({
                template: path.resolve(__dirname, rootPath, entry?.html?.in ? entry.html.in: "index.ejs"),
                filename: path.join(__dirname, outPath, entry?.html?.out ? entry.html.out: "index.html"),
                minify: false,
                scriptLoading: settings?.scriptLoading ? settings.scriptLoading: "defer"
            }));
    }

    if (!(settings?.doNotCleanup)) {
        plugins.push(new CleanWebpackPlugin());
    }

    let copyDeps = [];
    if (settings?.copyDeps)
        copyDeps.push(...settings.copyDeps);

    if (copyDeps.length) {
        plugins.push(
            new CopyWebpackPlugin(
                {
                    patterns: copyDeps.map((item) => {
                        return {
                            from: path.resolve(__dirname, item[0]),
                            to: item[1] || item[0]
                        };
                    })
                })
        );
    }

    let ent = {};
    ent[jsOut] = path.resolve(__dirname, rootPath, jsIn);
    if (entry.test)
        ent[entry.test] = path.resolve(__dirname, rootPath, path.dirname(jsIn), entry.test);

    // console.log("jsIn: ", jsIn, "jsOut: ", jsOut);
    return {
        entry: ent,
        output: {
            filename: "[name]",
            path: path.resolve(__dirname, outPath)
        },
        target: "web",
        resolve: {
            modules: [
                path.resolve(__dirname, "node_modules"),
            ],
            extensions: [".js", ".ts"]
            // fallback: {
            //     "path": require.resolve("path-browserify"),
            //     "crypto": require.resolve("crypto-browserify"),
            //     "stream": require.resolve("stream-browserify")
            // }
        },
        mode: "development",
        devtool: "eval",
        module: {
            rules: [
                {
                    test: /\.(ttf|woff|woff2|eot)$/,
                    use: [
                        {
                            loader: "file-loader",
                            options: {
                                esModule: false,
                            },
                        },
                    ],
                },
                {
                    test: /\.css$/,
                    use: ["style-loader", "css-loader"],
                },
                {
                    test: /\.wgsl$/i,
                    use: [
                        {
                            loader: 'raw-loader',
                            options: {
                                esModule: true,
                            },
                        },
                    ],
                },
                {
                    test: /\.ts$/,
                    include: path.join(__dirname, "."),
                    loader: "ts-loader"
                }
            ]
        },
        plugins: [
            ...plugins,
        ],
        devServer: {
        }
    };
}

module.exports = (env, argv) => {
    return [
        generateConfig("./", "./dist", 
        {  
            js: {in: path.join("tests", "index.js")},
            html: {in: path.join("tests", "index.ejs")},
        }
        , {doNotCleanup: true, copyDeps: toCopy}),
    ];
};
