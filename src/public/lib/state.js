const path = require('path')
const electron = require('electron')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const fs = require('../lib/fs')

class State {
    constructor(option = {
        path: null,
        file: null,
        data: {}
    }) {
        this._option = Object.assign({
            path: electron.app.getPath('userData'),
            file: 'state.json',
            data: {},
        }, option)

        this.DB_PATH = path.join(this._option.path, this._option.file)
        this._init()


        if (this.db)
            this.db.defaults(this._option.data).write()
    }

    get data() {
        try {
            return this.db.getState()
        }
        catch (err) {
            return this._option.data
        }
    }

    get def() {
        return this._option.data
    }

    setState(state) {
        const data = Object.assign(Object.assign({}, this._option.data), state)
        this.db.setState(data).write()
    }

    async _init() {
        try {
            const adapter = new FileSync(this.DB_PATH)
            this.db = low(adapter)
        }
        catch (err) {
            await fs.createFiles({
                path: this.DB_PATH,
                type: 'file'
            })
            const adapter = new FileSync(this.DB_PATH)
            this.db = low(adapter)
        }
    }
}

module.exports = State