const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron')
const path = require('path')
const url = require('url')
const createDB = require('./public/lib/createDB')
const State = require('./public/lib/state')
const { minmax } = require('./public/lib/common')

const USER_DATA_PATH = app.getPath('userData')
createDB(USER_DATA_PATH)

let mainWindow

const state = new State({
    data: {
        width: 1400,
        height: 800
    }
})

function createWindow() {

    mainWindow = new BrowserWindow({
        width: state.data.width,
        height: state.data.height,
        x: state.data.x,
        y: state.data.y,
        minWidth: 800,
        minHeight: 550,
        backgroundColor: '#191c1e',
        title: 'Sound Spot',
        frame: 'win32' === process.platform ? false : true,
        webPreferences: {
            nodeIntegrationInWorker: true,
            nodeIntegration: true,
        }
    })


    if (state.data.isMaximized)
        mainWindow.maximize()


    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'public/index.html'),
        protocol: 'file:',
        slashes: true
    }))

    mainWindow.on('closed', _ => {
        mainWindow = null

    })



    mainWindow.on('close', _ => {
        const { screen } = require('electron')
        const display = screen.getPrimaryDisplay().workAreaSize
        const { width, height, x, y } = mainWindow.getNormalBounds()
        const isMaximized = mainWindow.isMaximized()

        state.setState({
            width,
            height,
            x: minmax(0, display.width - width - 5, x),
            y: minmax(0, display.height - height - 5, y),
            isMaximized
        })
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