const Notification = require('./notification')
const Modal = require('./modal')
const Select = require('./select')
const Switch = require('./switch')
const Progress = require('./progress')
const Playlist = require('./playlist')
const Grid = require('./grid')
const Outlet = require('./outlet')

class Components {
    static Notification(...option) {
        const notification = new Notification(...option)
        document.body.appendChild(notification)
        return notification
    }

    static Modal(...option) {
        return new Modal(...option)
    }

    static Select(...option) {
        return new Select(...option)
    }

    static Switch(...option) {
        return new Switch(...option)
    }

    static Progress(...option) {
        return new Progress(...option)
    }

    static Playlist(...option) {
        return new Playlist(...option)
    }

    static Grid(...option) {
        return new Grid(...option)
    }

    static Outlet(...option) {
        return new Outlet(...option)
    }
}

module.exports = Components