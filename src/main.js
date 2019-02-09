const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron')
const path = require('path')
const url = require('url')
const createDB = require('./public/lib/createDB')

const USER_DATA_PATH = app.getPath('userData')
createDB(USER_DATA_PATH)

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

app.on('ready', _ => {
    createWindow()
    ipcMain.on('app:init', ({ sender }) => {
        globalShortcut.register('VolumeUp', _ => sender.send('key:VolumeUp'))
        globalShortcut.register('VolumeDown', _ => sender.send('key:VolumeDown'))
        globalShortcut.register('VolumeMute', _ => sender.send('key:VolumeMute'))
        globalShortcut.register('MediaNextTrack', _ => sender.send('key:MediaNextTrack'))
        globalShortcut.register('MediaPreviousTrack', _ => sender.send('key:MediaPreviousTrack'))
        globalShortcut.register('MediaStop', _ => sender.send('key:MediaStop'))
        globalShortcut.register('MediaPlayPause', _ => sender.send('key:MediaPlayPause'))
    })
})

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
    const chokidar = require('chokidar')
    app.on('ready', _ => mainWindow.webContents.openDevTools())
    chokidar.watch(path.join(__dirname, 'public')).on('change', _ => mainWindow.reload())
}