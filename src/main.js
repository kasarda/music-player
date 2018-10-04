const electron = require('electron')
const { ipcMain } = require('electron')
const path = require('path')
const url = require('url')

const app = electron.app
const BrowserWindow = electron.BrowserWindow


let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({ width: 1400, height: 800 })

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'public/index.html'),
        protocol: 'file:',
        slashes: true
    }))

    mainWindow.on('closed', _ => {
        mainWindow = null
    })

    mainWindow.webContents.openDevTools()
}

app.on('ready', createWindow)

app.on('window-all-closed', _ => {
    if (process.platform !== 'darwin')
        app.quit()
})

app.on('activate', _ => {
    if (mainWindow === null)
        createWindow()
})



// Checker
const update = require('./backend/check')

ipcMain.on('check_for_updates', event => {
    update(event.sender)
})







/* Watcher */
const chokidar = require('chokidar');
chokidar.watch(path.join(__dirname, 'public'))
    .on('change', _ => mainWindow.reload())
