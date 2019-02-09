const { createElement } = require('../lib/common')
const { version } = require('../../config')
const openBrowser = require('open')

class Help {

    rows(arr) {
        let rows = []
        for (const item of arr)
            rows.push(createElement('tr', [
                createElement('td', [
                    createElement('code', item[0])
                ]),
                createElement('td', item[1])
            ]))
        return rows
    }

    render() {
        return [
            createElement('h1', 'About'),
            createElement('i', [
                createElement('span', `version ${version}`),
                createElement('', '© 2019 Filip Kasarda'),
                createElement('span', 'See the project on '),
                createElement('a', {
                    text: 'Github',
                    on: {
                        click: _ => openBrowser('https://github.com/kasarda/music-player')
                    }
                }),
            ]),
            createElement('h2', 'Shortcuts'),
            createElement('table.table', [
                createElement('thead', [
                    createElement('th', 'Shortcut'),
                    createElement('th', 'Action'),
                ]),
                createElement('tbody', this.rows([
                    ['F1', 'Help'],
                    ['F11', 'Fullscreen on/off'],
                    ['Escape', 'Cancel Fullscreen'],
                    ['F8', 'Volume on/off'],
                    ['Space', 'Play/Pause'],
                    ['Ctrl+P', 'Play/Pause'],
                    ['Ctrl+R', 'Toggle Repeat'],
                    ['Ctrl+S', 'Toggle Shuffle'],
                    ['Ctrl+F', 'Focus on search field'],
                    ['Ctrl+L', 'Focus on filter field'],
                    ['Ctrl+N', 'Create new playlist'],
                    ['Ctrl+O', 'Open new folder'],
                    ['Ctrl+Q', 'Open now playing'],
                    ['Ctrl+Backspace', 'Browse Back'],
                    ['Ctrl+Arrow Right', 'Next Track'],
                    ['Ctrl+Arrow Left', 'Previous Track'],
                    ['Ctrl+Arrow Up', 'Volume Up'],
                    ['Ctrl+Arrow Down', 'Volume Down']
                ]))
            ])
        ]
    }
}

module.exports = Help