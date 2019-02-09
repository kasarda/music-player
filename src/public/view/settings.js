const { createElement, createIcon, Icon, Ev } = require('../lib/common')
const { debugInSettings } = require('../../config')

class Settings {
    constructor(outlet, model, view, controller) {
        this.view = view
        this.model = model
        this.items = []

        this.model.on(Ev.ADD_FOLDER, (folder) => {
            this.list.appendChild(this.addFolder(folder))
        }, 'settings')

        this.model.on(Ev.REMOVE_FOLDER, (_, folder) => {
            this.items.forEach(item => {
                if (item.dataset.folder === folder)
                    item.remove()
            })
        }, 'settings')

    }

    addFolder(folder) {
        const item = createElement('li', {
            data: {
                folder
            },
            child: [
                createElement('span', {
                    text: folder
                }),
                createIcon(Icon.CLOSE, {
                    on: {
                        click: _ => this.view.removeFolder(folder)
                    }
                })
            ]
        })
        this.items.push(item)
        return item
    }

    renderWillUnmount() {
        this.model.removeAllEventListeners('settings')
    }

    render() {

        const folders = this.model.folders
        this.list = createElement('ul.block', folders.map(f => this.addFolder(f)))


        const radio = this.view.Radio([
            {
                label: 'Dark',
                value: 'dark',
                active: this.model.def.theme === 'dark'
            },
            {
                label: 'Light',
                value: 'light',
                active: this.model.def.theme === 'light'
            }
        ])

        radio.addEventListener('change', e => {
            this.model.setDef({ theme: e.detail.value })
            document.documentElement.dataset.theme = e.detail.value
        })


        return [
            createElement('h1', 'Settings'),
            createElement('h2', 'Folders to watch'),
            this.list,
            createElement('.add-folder', {
                child: [
                    createIcon(Icon.ADD),
                    createElement('span', 'Add some music')
                ],
                on: {
                    click: _ => this.view.addFolder()
                }
            }),
            createElement('h2', 'Theme'),
            createElement('.option', [radio]),
            createElement('h2', 'Clear all data'),
            createElement('button', {
                text: 'Clear data',
                ontrigger: _ => this.view.clearData()
            }),
            createElement('', [
                createElement('h2', 'Debug'),
                createElement('button', {
                    text: 'open dev tools',
                    ontrigger: _ => this.view.currentWindow.openDevTools()
                })
            ], debugInSettings)
        ]
    }
}

module.exports = Settings