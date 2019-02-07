const electron = require('electron')
const path = require('path')
const url = require('url')
const createDB = require('./public/lib/createDB')

const app = electron.app
const BrowserWindow = electron.BrowserWindow

const DB = app.getPath('userData')
createDB(DB)

let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 800,
        minWidth: 800,
        minHeight: 550,
        backgroundColor: '#191c1e',
        title: process.env.npm_package_title,
        frame: 'win32' === process.platform ? false : true,
        webPreferences: {
            nodeIntegrationInWorker: true,
            nodeIntegration: true,
        }
    })

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'public/index.html'),
        protocol: 'file:',
        slashes: true
    }))

    mainWindow.on('closed', _ => {
        mainWindow = null
    })

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



const { env } = require('./config')
if (env === 'dev') {

    app.on('ready', _ => {
        mainWindow.webContents.openDevTools()
    })
    /* Watcher */
    const chokidar = require('chokidar');
    chokidar.watch(path.join(__dirname, 'public'))
        .on('change', _ => mainWindow.reload())
}