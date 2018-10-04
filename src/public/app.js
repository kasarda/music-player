const { ipcRenderer } = require('electron')

const Welcome = require('./view/welcome')
const Playlist = require('./view/playlist')
const Collection = require('./view/collection')
const Search = require('./view/search')
const List = require('./view/list')
const Footer = require('./view/footer')

const { Event, Render, Component, isEmpty } = require('./lib/common')

const Model = require('./core/model')
const View = require('./core/view')
const Controller = require('./core/controller')

const model = new Model
const controller = new Controller(model)
const view = new View(model, controller)

/*
?GENERAL
TODO history for outlet
TODO option for watch file if there is audio file if it is added to the db
TODO publish on the github

?PLAYLIST
TODO click for table

?MODAL
TODO on enter key confirm on esc cancel
TODO Auto focus on input, default state after reopening

?COMMON
TODO rename Event

?EVENT
TODO keyed error data

?SELECT
TODO Create functionality for moving subwrapper if is outside of the window
TODO change css

?NOTIFICATION
TODO run only one notification for added songs
TODO use undo functionality for removing stuff

?BACKEND
TODO recreate check for updates

?OTHERS
TODO Handle css scrolling of the playlist table
todo on first attempt to add song it doesnt do anything
TODO support for videos
TODO metadata artists should be array
TODO link in table row artist, album
Todo if song end and we filtreed nothing happend
TODO modal open will be append to the body

!TODO Fixe isssue with controller and page renderer when using filter
todo add remove for controller updater
! Todo Remove table data and filter sort option
todo model reset def to default
todo make sure that everything delaing with DB is immutable
TODO filter and sort
todo remove err param in addEventListener and create new special event for errors
todo create playlist collection for search
todo validator for volume etc in controller
*/









/*
    Main outlet
*/

const mainOutlet = view.component.Outlet({
    component: {
        [Component.WELCOME]: Welcome,
        [Component.PLAYLIST]: Playlist,
        [Component.COLLECTION]: Collection,
        [Component.SEARCH]: Search
    },
    dependencies: [model, view, controller],
    render: isEmpty(model.def.page) ? Component.WELCOME : null
})

view.node.section.appendChild(mainOutlet)
view.outlet = mainOutlet





/*
    Footer outlet
*/
const footerOutlet = view.component.Outlet({
    state: {},
    component: {
        footer: Footer
    },
    dependencies: [model, view, controller, mainOutlet],
    render: 'footer'
})

view.node.footer.appendChild(footerOutlet)







/*
    List outlet
*/
const list = view.component.Outlet({
    state: {
        playlists: model.playlists
    },
    component: {
        list: List
    },
    dependencies: [mainOutlet, model, view],
    render: 'list'
})

view.node.options.parentElement.insertBefore(list, view.node.options)

// set active link
mainOutlet.addEventListener('render', e => {
    const state = e.target.state

    view.node.items.forEach(item => {
        item.classList.remove('active')

        if (
            ('playlist' in item.dataset && item.dataset.playlist === state.type) ||
            ('collection' in item.dataset && item.dataset.collection === state.type) ||
            ('id' in item.dataset && item.dataset.id === state.playlistID)
        ) {
            item.classList.add('active')
        }
    })


})







/*
    Default
*/
if (!isEmpty(model.def.page)) {
    const { component, type, prop } = model.def.page
    view.render(component, type, prop)
}


if (!isEmpty(model.def.renderer)) {
    const state = view.getState(model.def.renderer)
    controller.addSongs(state.songs)
        .queue(state.songs, model.def.renderer)
        .filter(model.def.filter)
        .play(model.def.song, true)

    if (model.def.currentTime)
        controller.audio.currentTime = model.def.currentTime
}

window.addEventListener('beforeunload', _ => {
    model.setDef({
        currentTime: controller.audio.currentTime,
        renderer: controller.renderer,
        page: mainOutlet.state.renderer,
        song: controller.current,
        volume: controller.audio.volume,
        shuffle: controller.shuffle,
        repeat: controller.repeat,
        filter: controller.filterText
    })

})











/*
    Search
*/
let prev = {
    channel: mainOutlet.channel,
    state: mainOutlet.target
}

view.node.search.addEventListener('focus', _ => {
    prev = {
        channel: mainOutlet.channel,
        state: mainOutlet.target
    }
})

view.node.search.addEventListener('input', _ => {
    const value = view.node.search.value

    if (value)
        view.render(Component.SEARCH, value)
    else
        mainOutlet.render(prev.channel, prev.state)
})






















/*
    Static link handling
*/
view.node.playlist.forEach(link => {
    link.addEventListener('click', _ => {
        const type = link.dataset.playlist
        view.render(Component.PLAYLIST, type)
    })
})

view.node.collection.forEach(link => {
    link.addEventListener('click', _ => {
        const type = link.dataset.collection
        view.render(Component.COLLECTION, type)
    })
})


view.node.action.forEach(link => {
    link.addEventListener('click', _ => {
        const type = link.dataset.action
        switch (type) {
            case 'create playlist':
                view.createPlaylist(model)
                break

            case 'setting':
                const modal = view.component.Modal({
                    title: 'Settings'
                })

                modal.open()
                document.body.appendChild(modal)
                break
        }
    })
})












/*
    Drag and drop
*/

window.addEventListener('drop', e => {
    e.preventDefault()
    document.body.classList.remove('drag')
    if (e.dataTransfer.items) {
        for (const item of e.dataTransfer.items) {
            const canPlay = model.audio.canPlayType(item.type)
            if (item.kind === 'file' && canPlay) {
                const file = item.getAsFile()

                if (
                    mainOutlet.channel !== Component.PLAYLIST ||
                    (mainOutlet.state.type !== Render.SONGS && mainOutlet.state.type !== Render.CUSTOM)
                ) {
                    model.addSong(file.path)
                    view.render(Component.PLAYLIST, Render.SONGS)
                }
                else if (mainOutlet.state.type === Render.CUSTOM) {
                    model.attachToPlaylist(file.path, mainOutlet.state.playlistID)
                }
                else {
                    model.addSong(file.path)
                }
            }
        }
    }
})

window.addEventListener('dragover', e => {
    e.preventDefault()
})

let counter = 0
window.addEventListener('dragenter', _ => {
    counter++
    document.body.classList.add('drag')
})

window.addEventListener('dragleave', _ => {
    counter--
    if (counter === 0)
        document.body.classList.remove('drag')
})








/*
    Model Handling
*/
model.addEventListener(Event.ADD_PLAYLIST, (err, playlist) => {
    view.render(Component.PLAYLIST, playlist.id)
})


function log() {
    console.log(
        `ORIGIN ->`, controller.originList, `\nQUEUE ->`, controller.queueList, `\nFILTER ->`, controller.filterText, `\nRENDERER ->`, controller.renderer)
}



/* Check for updates */
// if (model.settings.checkForUpdates) {
//     ipcRenderer.send('check_for_updates')
// }

// ipcRenderer.on('remove song', (_, id) => {
//     model.removeSong(id)
//     console.log('Song was removed')
// })

// ipcRenderer.on('update metadata', (_, id, metadata) => {
//     model.updateSong(id, {
//         metadata
//     })
//     console.log('Metadata updated')
// })

