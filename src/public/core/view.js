const Outlet = require('../component/outlet')
const Modal = require('../component/modal')
const Timeline = require('../component/timeline')
const Playlist = require('../component/playlist')
const Collection = require('../component/collection')
const Select = require('../component/select')
const Notification = require('../component/notification')
const Radio = require('../component/radio')
const Fullscreen = require('../component/fullscreen')
const Menu = require('../component/menu')

class View {
    constructor(model, controller, currentWindow) {
        this.model = model
        this.controller = controller
        this.notification = this.Notification({
            time: 2000
        })
        this.writeDefData = true

        this.currentWindow = currentWindow

        this.Node = {
            section: document.getElementById('content'),
            nav: document.getElementById('nav'),
            footer: document.getElementById('footer'),
            search: document.getElementById('search'),
            mainlist: document.getElementById('mainlist'),
            playlist: document.getElementById('playlist'),
            settings: document.getElementById('settings'),
            createPlaylist: document.getElementById('create-playlist'),
            get items() {
                return document.querySelectorAll('nav li[data-key]')
            },
            get playlistItems() {
                return Array.from(this.playlist.querySelectorAll('li[data-key]'))
            },
            title: document.querySelector('#title'),
            artist: document.querySelector('footer .artist'),
            cover: document.querySelector('footer .cover'),
            favParent: document.getElementById('fav'),
            get fav() {
                return this.favParent.firstElementChild
            },
            timeline: document.getElementById('timeline-container'),
            play: document.getElementById('play'),
            shuffle: document.getElementById('shuffle'),
            repeat: document.getElementById('repeat'),
            next: document.getElementById('next'),
            prev: document.getElementById('prev'),
            volume: document.getElementById('volume'),
            queue: document.getElementById('queue'),
            fullscreen: document.getElementById('fullscreen'),
            get outlet() {
                return this.section.querySelector('outlet-component')
            },
            get playlistComponent() {
                return this.section.querySelector('playlist-component')
            },
            back: document.querySelector('#back'),
            loader: document.querySelector('#loader'),
            closeFullscreen: document.querySelector('#close-fullscreen')

        }


        this.folder = document.createElement('input')
        this.folder.type = 'file'
        this.folder.webkitdirectory = true

        this.file = document.createElement('input')
        this.file.type = 'file'
        this.file.accept = 'audio/*'
        this.file.multiple = true

    }

    Outlet(options) {
        return new Outlet(options, this.Node.section, this.model, this.controller)
    }

    Modal(options) {
        return new Modal(options)
    }

    Timeline(options) {
        return new Timeline(options)
    }

    Playlist(options) {
        return new Playlist(options, this.model, this.controller, this)
    }

    Collection(options) {
        return new Collection(options, this.controller, this)
    }

    Select() {
        return new Select
    }

    Notification(options) {
        return new Notification(options)
    }

    Radio(option) {
        return new Radio(option)
    }

    Fullscreen() {
        return new Fullscreen(this.model, this, this.controller)
    }
    Menu() {
        if (process.platform === 'win32')
            return new Menu
    }

    addFolder() {
        this.folder.click()
        this.folder.onchange = _ => {
            for (const { path } of this.folder.files)
                this.model.addFolder(path)

            this.folder.value = null
        }
    }

    renamePlaylist(id) {
        const modal = this.Modal({
            title: 'Rename playlist',
            label: 'Name',
            confirm: 'Rename'
        })
        modal.open()

        modal.addEventListener('confirm', e => {
            const { value } = e.detail
            this.model.renamePlaylist(id, value)
        })
    }

    removePlaylist(id) {
        const modal = this.Modal({
            title: 'Are you sure?',
            type: 'confirm',
            confirm: 'Confirm'
        })
        modal.open()

        modal.addEventListener('confirm', _ => {
            this.model.removePlaylist(id)
        })
    }

    removeFolder(folderURL) {
        const modal = this.Modal({
            title: `Are you sure you want to remove ${folderURL}?`,
            type: 'confirm',
            confirm: 'Remove'
        })

        modal.open()

        return new Promise(resolve => {
            modal.addEventListener('confirm', _ => {
                this.model.removeFolder(folderURL)
                resolve(true)
            })
        })
    }

    clearData() {
        const modal = this.Modal({
            title: 'Are you sure?',
            type: 'confirm',
            confirm: 'Clear all'
        })
        modal.open()

        modal.addEventListener('confirm', _ => {
            this.writeDefData = false
            this.model.__clear__(true)
        })
    }
}

module.exports = View





