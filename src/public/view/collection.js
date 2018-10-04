const { createElement } = require('../lib/query')
const { Component } = require('../lib/common')


class Collection {
    constructor(outlet, model, view) {
        this.outlet = outlet
        this.model = model
        this.view = view
    }

    static getItems(collection, useGridTitle, type = false) {
        const items = []

        // set proper collectionType
        let collectionType = this.state.type
        if (type)
            collectionType = type

        // return items for collection
        if (collection) {
            for (const prop in collection.props) {
                const { artist, songs } = collection.props[prop]

                // set picture for a collection item
                let poster
                songs.forEach(song => {
                    if (!poster && song.metadata.picture)
                        poster = song.metadata.picture
                })

                const item = {
                    title: artist,
                    subtitle: useGridTitle ? prop : null,
                    poster,
                    action: _ => {
                        this.view.render(Component.PLAYLIST, collectionType, prop)
                    }
                }

                items.push(item)
            }

            // append unknown item
            if (collection.unknown.length) {
                const unknown = {
                    title: 'Others',
                    action: _ => {
                        this.view.render(Component.PLAYLIST, collectionType, true)
                    }
                }

                items.push(unknown)
            }
        }

        return items
    }

    render(state) {
        this.state = state

        const title = createElement('h1', {
            text: state.title
        })

        const items = Collection.getItems.call(this, state.collection, state.useGridTitle)
        const grid = this.view.component.Grid(items)

        const filter = createElement('input', {
            prop: {
                placeholder: 'Filter'
            },
            on: {
                input: _ => grid.filter(filter.value)
            }
        })


        return createElement('.collection', {
            child: [
                createElement('header', {
                    child: createElement('.content', {
                        child: title
                    })
                }),
                createElement('.filter', {
                    child: filter
                }),
                grid
            ]
        })
    }
}


module.exports = Collection