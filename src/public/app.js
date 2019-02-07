/**
 * 
 * create name and fav icon
 * README 
 * better sorting for example empty goes at the end and sort no of song by CD + fixed error when unknown is before known
 */
const electron = require('electron')
const WebWorker = require('kasarda/node/worker')
const { getProgress, getValue } = require('kasarda/node/common')
const { Ev, Err, createElement, changeIcon, createIcon, Icon, toDurationString, Outlet, Render, Key, isOverflow } = require('./lib/common')

const USER_DATA_PATH = electron.remote.app.getPath('userData')

const worker = new WebWorker('./core/watch.js')
worker.send('init_data', USER_DATA_PATH)

const Model = require('./core/model/main')
const Controller = require('./core/controller')
const View = require('./core/view')

const Songs = require('./view/songs')
const Albums = require('./view/albums')
const Artists = require('./view/artists')
const Search = require('./view/search')
const Settings = require('./view/settings')
const About = require('./view/about')

const currentWindow = electron.remote.getCurrentWindow();
const model = new Model(worker, USER_DATA_PATH)
const controller = new Controller(model)
const view = new View(model, controller, currentWindow)


electron.ipcRenderer.send('app:init')

// create custom menu on windows
view.Menu()

// Create main outlet
const outlet = view.Outlet({
    component: {
        [Outlet.SONGS]: Songs,
        [Outlet.ALBUMS]: Albums,
        [Outlet.ARTISTS]: Artists,
        [Outlet.SEARCH]: Search,
        [Outlet.SETTINGS]: Settings,
        [Outlet.ABOUT]: About
    },
    dependencies: [model, view, controller]
})


view.Node.section.appendChild(outlet)
const fullscreen = view.Fullscreen()

outlet.onRender(_ => {
    view.Node.items.forEach(item => {
        item.classList.remove('active')
        if (item.dataset.key === outlet.key)
            item.classList.add('active')
    })

    view.Node.section.scrollTop = 0
    fullscreen.close()
})

outlet.onError(_ => outlet.render(Render.MUSIC))

if (model.def.page instanceof Array)
    outlet.render(...model.def.page)
else
    outlet.render(Render.MUSIC)








/* Navigation */
view.Node.back.addEventListener('click', _ => outlet.history.back())

view.Node.items.forEach(item => {
    const key = item.dataset.key

    item.addEventListener('click', _ => {
        switch (key) {
            case Key.MUSIC:
                outlet.render(Render.MUSIC)
                break
            case Key.FAV:
                outlet.render(Render.FAV)
                break
            case Key.NOW_PLAYING:
                outlet.render(Render.NOW_PLAYING)
                break
            case Key.RECENTS:
                outlet.render(Render.RECENTS)
                break
            case Key.MOST_PLAYED:
                outlet.render(Render.MOST_PLAYED)
                break
            case Key.ALBUMS:
                outlet.render(Render.ALBUMS)
                break
            case Key.ARTISTS:
                outlet.render(Render.ARTISTS)
                break
            case Key.SETTINGS:
                outlet.render(Render.SETTINGS)
                break
            case Key.ABOUT:
                outlet.render(Render.ABOUT)
                break
        }
    })
})



function createPlaylistItem({ name, id }) {
    const li = createElement('li', {
        text: name,
        data: {
            key: Key.PLAYLIST(id),
            id
        },
        on: {
            click: _ => outlet.render(Render.PLAYLIST(id), id)
        }
    })
    view.Node.playlist.appendChild(li)
}


model.playlists.forEach(playlist => createPlaylistItem(playlist))
model.on(Ev.ADD_PLAYLIST, playlist => createPlaylistItem(playlist))

model.on(Ev.REMOVE_PLAYLIST, playlist => {
    view.Node.playlistItems.forEach(item => {
        if (item.dataset.key === Key.PLAYLIST(playlist.id))
            view.Node.playlist.removeChild(item)
    })
})

model.on(Ev.RENAME_PLAYLIST, (playlist, name) => {
    view.Node.playlistItems.forEach(item => {
        if (item.dataset.key === Key.PLAYLIST(playlist.id))
            item.innerHTML = name
    })
})


const createPlaylistModal = view.Modal({
    title: 'Create playlist',
    label: 'Name',
    confirm: 'Create'
})

view.Node.createPlaylist.addEventListener('click', _ => createPlaylistModal.open())
createPlaylistModal.addEventListener('confirm', async e => {
    const { id } = await model.addPlaylist(e.detail.value)
    outlet.render(Render.PLAYLIST(id), id)
})






/* Search */
void (_ => {
    let prevState = null
    view.Node.search.addEventListener('change', _ => {
        if (!prevState)
            prevState = outlet.data

        if (view.Node.search.value)
            outlet.render(Render.SEARCH, view.Node.search.value)
    })

    view.Node.search.addEventListener('input', _ => {
        if (view.Node.search.value === '' && prevState instanceof Array) {
            if (prevState.includes(Render.SEARCH))
                prevState = [Render.MUSIC]
            outlet.render(...prevState)
            prevState = null
        }
    })
})()
















/*Footer*/
controller.on(Ev.LOAD, async _ => {
    const song = controller.currentSong

    view.Node.title.innerHTML = song.metadata.title
    view.Node.title.title = song.metadata.title

    view.Node.title.classList.remove('text-anim')
    void document.body.offsetWidth
    if (isOverflow(view.Node.title))
        view.Node.title.classList.add('text-anim')


    view.Node.artist.innerHTML = ''
    view.Node.artist.title = song.metadata.artists.join(', ')

    song.metadata.artists.map(artist => {
        return createElement('span', {
            text: artist,
            on: {
                click: _ => outlet.render(Render.ARTIST(artist), artist)
            }
        })
    }).forEach(elem => view.Node.artist.appendChild(elem))

    const isFav = model.isFav(song.id)
    const fav = createIcon(Icon.FAVORITE_BORDER)

    if (isFav)
        changeIcon(fav, Icon.FAVORITE)

    view.Node.favParent.innerHTML = ''
    view.Node.favParent.appendChild(fav)

    const url = song.metadata.cover
    view.Node.cover.innerHTML = ''
    if (url) {
        const img = new Image()
        img.src = url
        img.addEventListener('error', _ => view.Node.cover.innerHTML = '')
        view.Node.cover.appendChild(img)
    }

})

controller.on([Ev.ERROR, Ev.RESET], _ => {
    view.Node.title.innerHTML = ''
    view.Node.title.classList.remove('text-anim')
    view.Node.title.title = ''
    view.Node.artist.innerHTML = ''
    view.Node.artist.title = ''
    view.Node.cover.innerHTML = ''
    view.Node.favParent.innerHTML = ''
    changeIcon(view.Node.play, Icon.PLAY)
})


view.Node.favParent.addEventListener('click', _ => {
    if (controller.currentID)
        model.toggleFav(controller.currentID)
})

model.on(Ev.FAV, (id, added) => {
    if (id === controller.currentID && view.Node.fav) {
        if (added)
            changeIcon(view.Node.fav, Icon.FAVORITE)
        else
            changeIcon(view.Node.fav, Icon.FAVORITE_BORDER)
    }
})






/* Timeline */
const timeline = view.Timeline({
    state: 0,
    text: ['0:00', '0:00']
})
timeline.setDisable()

view.Node.timeline.appendChild(timeline)

controller.on(Ev.LOAD, _ => {
    timeline.setText(null, toDurationString(controller.duration))
})

controller.on(Ev.TIME, _ => {
    timeline.setDisable(false)
    const state = getProgress(0, controller.duration, controller.time)
    timeline.setState(state, false)
    if (!timeline.draged)
        timeline.setText(toDurationString(controller.time))
})

controller.on([Ev.ERROR, Ev.RESET], _ => {
    timeline.setDisable()
    timeline.setState(0, false)
    timeline.setText(...timeline.text)
})

controller.on(Ev.LOAD_START, _ => {
    timeline.setState(0, false)
})

timeline.addEventListener('change', e => {
    controller.setTime(e.detail.state)
})

timeline.addEventListener('drag', e => {
    const time = getValue(0, controller.duration, e.detail.state)
    timeline.setText(toDurationString(time))
})




/*Controllers */
view.Node.play.addEventListener('click', _ => {
    if (controller.queue.length)
        controller.toggle()
    else if (view.Node.playlistComponent)
        view.Node.playlistComponent.play()
})

controller.on(Ev.PLAY, _ => {
    changeIcon(view.Node.play, Icon.PAUSE)
})

controller.on([Ev.PAUSE, Ev.ERROR], _ => {
    if (!controller.ended)
        changeIcon(view.Node.play, Icon.PLAY)
})


view.Node.shuffle.addEventListener('click', _ => controller.toggleShuffle())
view.Node.repeat.addEventListener('click', _ => controller.toggleRepeat())
view.Node.next.addEventListener('click', _ => controller.next())
view.Node.prev.addEventListener('click', _ => controller.prev())


function setRepeatIcon(type) {
    let icon
    view.Node.repeat.classList.remove('fade')
    switch (type) {
        case controller.REPEAT:
            icon = Icon.REPEAT
            break
        case controller.REPEAT_ALL:
            icon = Icon.REPEAT_ALL
            break
        case controller.NO_REPEAT:
            icon = Icon.NO_REPEAT
            view.Node.repeat.classList.add('fade')
            break
    }

    if (type)
        changeIcon(view.Node.repeat, icon)
}


function setshuffleIcon(shuffle) {
    if (shuffle)
        view.Node.shuffle.classList.remove('fade')
    else
        view.Node.shuffle.classList.add('fade')
}

setshuffleIcon(controller.shuffle)
setRepeatIcon(controller.repeat)
controller.on(Ev.REPEAT, type => setRepeatIcon(type))
controller.on(Ev.SHUFFLE, shuffle => setshuffleIcon(shuffle))


/*Options*/
const volume = view.Timeline({
    state: model.def.volume,
    icon: Icon.VOLUME_UP
})
controller.setVolume(volume.state)
view.Node.volume.appendChild(volume)

volume.addEventListener('drag', e => {
    controller.setVolume(e.detail.state)
})


function updateVolumeIcon() {
    if (controller.volume === 0)
        volume.setIcon(Icon.VOLUME_OFF)
    else if (controller.volume < .5)
        volume.setIcon(Icon.VOLUME_DOWN)
    else
        volume.setIcon(Icon.VOLUME_UP)
}

updateVolumeIcon()
controller.on(Ev.VOLUME, _ => {
    volume.setState(controller.volume)
    updateVolumeIcon()
})

let prevVolume = .75
volume.addEventListener('icon', _ => {
    if (controller.volume > 0) {
        prevVolume = controller.volume
        controller.setVolume(0)
    }
    else {
        controller.setVolume(prevVolume)
    }
})

view.Node.queue.addEventListener('click', _ => {
    outlet.render(Render.NOW_PLAYING)
})


view.Node.fullscreen.addEventListener('click', _ => fullscreen.toggle())
controller.on([Ev.SET_QUEUE, Ev.ADD_QUEUE], _ => view.Node.fullscreen.classList.remove('fade'))
controller.on(Ev.EMPTY_PLAYLIST, _ => view.Node.fullscreen.classList.add('fade'))

view.Node.closeFullscreen.addEventListener('click', _ => fullscreen.close())








/*
    Drag and drop
*/

window.addEventListener('drop', e => {
    e.preventDefault()
    document.body.classList.remove('drag')

    const id = e.dataTransfer.getData('text')
    const playlistID = e.target.dataset.id


    if (model.isID(id) && view.Node.playlistItems.includes(e.target))
        model.addSongToPlaylist(id, playlistID)

    if (e.dataTransfer.items) {
        for (const item of e.dataTransfer.items) {
            const isAudio = controller._audio.canPlayType(item.type)

            if (item.kind === 'file') {
                const file = item.getAsFile()
                if (!file.type && file.size % 4096 === 0) {
                    if (view.Node.playlistItems.includes(e.target))
                        model.addFolder(file.path, playlistID)
                    else
                        model.addFolder(file.path)
                }
                else if (isAudio) {
                    if (view.Node.playlistItems.includes(e.target))
                        model.addSong(file.path, undefined, playlistID)
                    else
                        model.addSong(file.path)
                }
            }
        }
    }

    view.Node.playlistItems.forEach(item => {
        item.classList.remove('drag-active')
    })
})

window.addEventListener('dragover', e => {
    e.preventDefault()
})

let _dragCounter = 0
window.addEventListener('dragenter', e => {
    _dragCounter++
    document.body.classList.add('drag')

    view.Node.playlistItems.forEach(item => {
        item.classList.remove('drag-active')
        if (e.target === item)
            item.classList.add('drag-active')
    })

})

window.addEventListener('dragleave', e => {
    _dragCounter--
    if (_dragCounter === 0)
        document.body.classList.remove('drag')
})


window.addEventListener('dragstart', e => {
    if (e.target.dataset.id)
        e.dataTransfer.setData('text/plain', e.target.dataset.id)
})





/* Watch folders */
worker.send('watch')





/* Notifications */
model.on(Ev.ADD_SONG_TO_PLAYLIST, _ => {
    view.notification.open('Song added to the playlist')
})

model.on(Ev.ADD_PLAYLIST, _ => {
    view.notification.open('Created playlist')
})

model.on(Ev.REMOVE_PLAYLIST, _ => {
    view.notification.open('Playlist removed')
})

model.on(Ev.ADD_FOLDER, _ => {
    view.notification.open('Adding songs from folder')
})

model.onError(Ev.ADD_FOLDER, err => {
    if (err === Err.FOLDER_ALREADY_EXIST || err === Err.FOLDER_IS_SUB_FOLDER)
        view.notification.open('Folder already added')
    else
        view.notification.open('Can\'t add folder')
})

controller.on(Ev.ERROR, _ => {
    view.notification.open('Can\'t play current song')
})









// Keyboard shortcuts
window.addEventListener('keydown', e => {
    if (document.activeElement.tagName !== 'INPUT') {

        if (e.code !== 'Tab')
            e.preventDefault()
        switch (e.code) {
            case 'Escape':
                fullscreen.close()
                break
            case 'F11':
                fullscreen.toggle()
                break
            case 'F8':
                volume.iconElement.click()
                break
            case 'F1':
                outlet.render(Render.ABOUT)
                break
            case 'Space':
                e.preventDefault()
                if (controller.hasSrc)
                    controller.toggle()
                break
        }

        if (e.ctrlKey) {
            switch (e.code) {
                case 'KeyP':
                    controller.toggle()
                    break
                case 'ArrowRight':
                    controller.next()
                    break
                case 'ArrowLeft':
                    controller.prev()
                    break
                case 'ArrowUp':
                    controller.increaseVolume()
                    break
                case 'ArrowDown':
                    controller.decreaseVolume()
                    break
                case 'KeyQ':
                    outlet.render(Render.NOW_PLAYING)
                    break
                case 'Backspace':
                    outlet.history.back()
                    break
                case 'KeyR':
                    controller.toggleRepeat()
                    break
                case 'KeyS':
                    controller.toggleShuffle()
                    break
                case 'KeyF':
                    view.Node.search.focus()
                    break
                case 'KeyN':
                    createPlaylistModal.open()
                    break
                case 'KeyO':
                    view.addFolder()
                    break
                case 'KeyL':
                    if (view.Node.playlistComponent)
                        view.Node.playlistComponent.filterElement.focus()
                    break
                case 'KeyM':
                    currentWindow.minimize()
                    break
            }
        }

        if (e.altKey && e.code === 'F4')
            electron.remote.app.quit()
    }
    else {
        if ((e.ctrlKey && e.code !== 'KeyA') || e.altKey || e.metaKey || e.code.match(/^F.[0-9]{0,2}/))
            e.preventDefault()
    }

    if (e.code === 'Escape' && document.activeElement.tagName === 'INPUT')
        document.activeElement.blur()
})


electron.ipcRenderer.on('key:VolumeUp', _ => controller.increaseVolume())
electron.ipcRenderer.on('key:VolumeDown', _ => controller.decreaseVolume())
electron.ipcRenderer.on('key:VolumeMute', _ => volume.iconElement.click())
electron.ipcRenderer.on('key:MediaStop', _ => controller.pause())
electron.ipcRenderer.on('key:MediaPlayPause', _ => controller.toggle())
electron.ipcRenderer.on('key:MediaNextTrack', _ => controller.next())
electron.ipcRenderer.on('key:MediaPreviouseTrack', _ => controller.prev())








/*Default rendering*/
if (model.def.currentID && model.def.queue) {
    for (const songView in model.def.queue) {
        const queue = model.def.queue[songView]
        controller.add(queue, songView)
    }
    controller.play(model.def.currentID, true)
}

window.addEventListener('beforeunload', _ => {
    if (view.writeDefData) {
        model.setDef({
            volume: volume.state,
            page: outlet.data,
            queue: controller.queueData,
            currentID: controller.currentID
        })
    }
})




// Loader
worker.read('loader:start', _ => view.Node.loader.hidden = false)
worker.read('loader:end', _ => view.Node.loader.hidden = true)