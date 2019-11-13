module.exports = {
    build: [
        'clean:build',
        'sh:build-es2018',
        'sh:build-es5-bundle',
        'sh:build-es5-module'
    ],
    continuous: [
        'karma:continuous'
    ],
    lint: [
        'sh:lint-config',
        'sh:lint-src',
        'sh:lint-test'
    ],
    test: [
        'karma:test'
    ]
};
