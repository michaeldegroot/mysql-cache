'use strict'

exports.getTheme = () => {
    return {
        'pretty-error > header > title > kind': {
            display: 'none',
        },
        'pretty-error': {
            margin: '0 0 0 0',
        },
        'pretty-error > header > colon': {
            display: 'none',
        },
        'pretty-error > header > message': {
            marginLeft:  2,
            marginRight: 2,
            color:       'bright-white',
            background:  'red',
            padding:     '0 0',
        },
        'pretty-error > trace > item': {
            marginLeft:  2,
            marginRight: 2,
            padding:     '0 0',
            bullet:      '" at "',
        },
        'pretty-error > trace > item > header > pointer > file': {
            color: 'bright-cyan',
        },
        'pretty-error > trace > item > header > pointer > colon': {
            color: 'cyan',
        },
        'pretty-error > trace > item > header > pointer > line': {
            color: 'bright-cyan',
        },
        'pretty-error > trace > item > header > what': {
            color: 'bright-white',
        },
        'pretty-error > trace > item > footer > addr': {
            color: 'grey',
        },
    }
}
