const electron = require('electron')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const fs = require('../lib/fs')
const path = require('path')

class State {
    constructor(option = {}) {
        this.option = Object.assign({
            path: electron.app.getPath('userData'),
            file: 'state.json',
            data: {},
        }, option)

        this.DB_PATH = path.join(this.option.path, this.option.file)
        this._init()


        if(this.db)
            this.db.defaults(this.option.data).write()
    }

    get data() {
        try {
            return this.db.getState()
        }
        catch(err) {
            return this.option.data
        }
    }

    setState(state) {
        const data = Object.assign(Object.assign({}, this.option.data), state)
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



// const state = new State({
//     path: 'userData',
//     file: 'data.json',
//     data: {
//         width: 100,
//         height: 100,
//         theme: 'dark'
//     },
//     maximize: true
// })


// state.save({
//     width: window.width(),
//     height: window.height(),
//     x: window.x,
//     y: window.y,
//     theme: window.theme
// })


module.exports = State