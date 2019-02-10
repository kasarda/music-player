const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron')
const path = require('path')
const url = require('url')
const WindowStateManager = require('electron-window-state-manager')
const createDB = require('./public/lib/createDB')
const State = require('./public/lib/state')

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

        let [width, height] = mainWindow.getSize()
        let [x, y] = mainWindow.getPosition()
        const isMaximized = mainWindow.isMaximized()

        if (isMaximized) {
            width = state.data.width
            height = state.data.height
            x = state.data.x
            y = state.data.y
        }

        if((width + x) > display.width)
            x = ((width + x) - ((width + x) - display.width)) - width - 5

        if ((height + y) > display.height)
            y = ((height + y) - ((height + y) - display.height)) - height - 5


        state.setState({
            width,
            height,
            x: Math.max(5, x),
            y: Math.max(5, y),
            isMaximized
        })
    })

    mainWindow.on('maximize',  _ => {
        console.log(mainWindow.getSize())
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