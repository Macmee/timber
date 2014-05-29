module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');
    
  grunt.initConfig({
    watch: {
      options: {
        livereload: true,
      },
      build_dev: {
        files: ['src/*.js'],
        tasks: 'build_dev'
      }
    },
    connect: {
      dev: {
        options: {
          port: 3000,
          base: '',
          keepalive: true
        }
      }
    }


  });

  grunt.registerTask('build_dev', '', function() {
    fs = require('fs');
    function compile(file, buffer) {
      var parent = false;
      if(typeof buffer === 'undefined') {
        buffer = [];
        parent = true;
      }
      var cwd = process.cwd();
      var data = fs.readFileSync(file, 'utf8');
      var basepath = file.substring(0, file.lastIndexOf('/')+1);
      process.chdir(basepath);
      var pos = -1;
      var startPos = 0;
      while( (pos = data.indexOf('include "', startPos)) != -1 ) {
        buffer.push(data.substring(startPos, pos));
        var fname = '';
        var c;
        pos += 9;
        while( (c = data[pos++]) != '"' )
          fname += c;
        if(/^[a-zA-Z_\-]/.test(fname))
            fname = './' + fname;
        startPos = pos + 1;
        compile(fname, buffer);
      }
      buffer.push(data.substring(startPos));
      process.chdir(cwd);
      if(parent)
        return buffer.join('');
    }
    var input = './src/timber.js';
    var output = './timber_compiled.js';
    var data = compile(input);
    var done = this.async();
    fs.writeFile(output, data, function(err) {
        if(err) {
            grunt.log.writeln(err);
        } else {
            grunt.log.writeln("The file was saved!");
        }
        done();
    }); 
  });

};
