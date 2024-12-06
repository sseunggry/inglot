"use strict";

// Load plugins
const {task, src, dest, watch, lastRun, series, parallel} = require("gulp");
const browserSync = require("browser-sync").create();
const del = require("del");
const plumber = require("gulp-plumber");
const imagemin = require("gulp-imagemin");
const sass = require('gulp-sass')(require('sass'));
const autoprefixer = require("autoprefixer");
const postcss = require("gulp-postcss");
const pxtorem = require('postcss-pxtorem');
const sourcemaps = require("gulp-sourcemaps");
const eslint = require("gulp-eslint");
const includer = require("gulp-html-ssi");
const newer = require('gulp-newer');
const cache = require('gulp-cache');
const replace = require('gulp-replace');

// paths setting
let paths = {
    build: "./build/",
    scss: {
        src: "./src/assets/scss/**/*",
        ignore: "!./src/assets/scss/_*",
        dest: "./build/assets/css"
    },
    csscopy: {
        src: "./src/assets/css/plugin/**/*",
        dest: "./build/assets/css/plugin"
    },
    img: {
        src: "./src/assets/images/**/*",
        dest: "./build/assets/images"
    },
    js: {
        src: "./src/assets/js/**/*",
        dest: "./build/assets/js"
    },
    fonts: {
        src: "./src/assets/fonts/**/*",
        dest: "./build/assets/fonts"
    },
    video: {
        src: "./src/assets/video/**/*",
        dest: "./build/assets/video"
    },
    html: {
        src: "./src/html/**/*",
        ignore: "!./src/html/include",
        dest: "./build/"
    }
}

// A simple task to reload the page
async function reload(done) {
    browserSync.reload();
    done();
}

// Clean assets
async function clean(cb) {
    return del(paths.build, cb);
}

// Copying fonts
async function fonts() {
    return src(paths.fonts.src)
        .pipe(dest(paths.fonts.dest))
}

// Optimize Images
async function images() {
    return src(paths.img.src, {since: lastRun(images)})
        .pipe(newer('build'))
        .pipe(cache(imagemin({interlaced: true})))
        .pipe(dest(paths.img.dest))
}

// SCSS task
const sassOptions = {
    //outputStyle: "compact",
    indentType: "tab",
    indentWidth: 1,
    precision: 2,
    sourceComments: false
};
const postOptions = [
    autoprefixer(),
    pxtorem({
        rootValue: 16, //기준 root 폰트 크기
        propList: ['*'], //변환할 속성 목록
        selectorBlackList: [], //변환하지 않을 선택자 목록
        minPixelValue: 2 //변환할 최소 픽셀 값
    })
];

async function scss() {
    return src([paths.scss.src, paths.scss.ignore])
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(sass(sassOptions).on("error", sass.logError))
        .pipe(postcss(postOptions))
        .pipe(sourcemaps.write("./maps"))
        .pipe(dest(paths.scss.dest))
        .pipe(browserSync.reload({stream: true}))
}

// Plug-in CSS copy
async function csscopy() {
    return src(paths.csscopy.src)
        .pipe(dest(paths.csscopy.dest))
        .pipe(browserSync.reload({stream: true}))
}

// Transpile, concatenate and minify scripts
let lintOptions = {
    fix: true,
    globals: ["jQuery", "$"],
    rules: {
        quotes: [1, "double"],
        semi: [1, "always"],
        indent: [1, "tab"]
    },
    extends: "eslint:recommended",
    parser: "babel-eslint",
    env: {
        commonjs: true,
        es6: true,
        node: true,
        browser: true,
        jquery: true
    }
}

async function scripts() {
    return src(paths.js.src)
        .pipe(plumber())
        .pipe(eslint(lintOptions))
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
        .pipe(dest(paths.js.dest))
}

// video publishing
async function video() {
    return src(paths.video.src)
        .pipe(dest(paths.video.dest))
}

// HTML SSI(Server Side Include) & SEO
async function htmlssi() {
    return src([paths.html.src, paths.html.ignore])
        .pipe(includer())
        .pipe(replace('src="/assets/', 'src="./assets/'))
        .pipe(replace('href="/assets/', 'href="./assets/'))
        .pipe(dest(paths.html.dest))
}

// server
async function server() {
    browserSync.init({
        server: {
            baseDir: paths.build,
        },
        startPath: "/index.html",
        port: 3000
    });
}

// watch files
async function watchFiles() {
    watch(paths.fonts.src, series(fonts, reload));
    watch(paths.img.src, series(images, reload));
    watch(paths.scss.src, scss);
    watch(paths.csscopy.src, csscopy);
    watch(paths.js.src, series(scripts, reload));
    watch(paths.video.src, series(video, reload));
    watch(paths.html.src, series(htmlssi, reload));
}

// define complex tasks
const web = parallel(fonts, images, scss, csscopy, scripts, video, htmlssi);

// export tasks
exports.reload = reload;
exports.clean = clean;
exports.fonts = fonts;
exports.images = images;
exports.scss = scss;
exports.csscopy = csscopy;
exports.scripts = scripts;
exports.video = video;
exports.htmlssi = htmlssi;
exports.server = server;
exports.watchFiles = watchFiles;
exports.web = web;
exports.build = series(clean, web);
exports.default = series(clean, web, parallel(server, watchFiles));