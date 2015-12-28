var gulp = require('gulp');
var concat = require('gulp-concat');
var minify = require('gulp-minify');

gulp.task('default', function() {

});

gulp.task('concat', function() {
    return gulp.src(['./js/js-hyphen/source/js-hyphen.js', './js/js-hyphen/source/js-hyphen-data-model.js', './js/js-hyphen/source/js-hyphen-http.js', './js/js-hyphen/source/js-hyphen-indexed-db.js'])
        .pipe(concat('js-hyphen.js'))
        .pipe(gulp.dest('./js/js-hyphen/dist/'));
});

gulp.task('compress', function() {
    gulp.src("./js/js-hyphen/dist/js-hyphen.js")
        .pipe(minify({
            //exclude: [''],
            compress: true,
            mangle: false,
            //ignoreFiles: ['']
        }))
        .pipe(gulp.dest('./js/js-hyphen/dist/'))
});


gulp.task('default', ['concat', 'compress']);