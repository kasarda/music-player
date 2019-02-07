const { createElement, createIcon, Icon, getFilterText, Key, Render } = require('../lib/common')

class Collection extends HTMLElement {
    constructor({
        type,
        items,
        useFilter = true
    }, controller, view) {
        super()
        this.type = type
        this.items = items
        this.useFilter = useFilter
        this.controller = controller
        this.view = view

        if (this.useFilter) {
            const filter = createElement('input', {
                append: this,
                prop: {
                    placeholder: 'Filter'
                },
                on: {
                    input: _ => this.filterBy(filter.value)
                }
            })
        }

        this.wrapper = createElement('.collection-wrapper', {
            append: this
        })

        for (const item of this.items)
            this.createItem(item)

    }

    getItem(key) {
        return this.itemElements[key]
    }

    get itemElements() {
        return this.querySelectorAll('.collection-item')
    }

    filterBy(value) {
        const text = getFilterText(value)
        if (text) {
            this.items
                .map(item => getFilterText(item.name, item.artist))
                .forEach((filterText, key) => {
                    const item = this.getItem(key)
                    if (!filterText.includes(text)) {
                        if (item)
                            item.attributeStyleMap.set('display', 'none')
                    }
                    else {
                        if (item)
                            item.attributeStyleMap.delete('display')
                    }
                })
        }
        else {
            this.itemElements.forEach(item => item.attributeStyleMap.delete('display'))
        }
    }

    _playItem(item) {
        this.controller.set(item.songs, this.type === 'album' ? Key.ALBUM(item.name) : Key.ARTIST(item.name))
        this.controller.play()
    }


    createItem(item) {
        createElement('.collection-item', {
            className: this.type,
            child: [
                createElement('img', {
                    src: item.cover,
                    on: {
                        error: (_, elem) => elem.remove()
                    }
                }, item.cover),
                createIcon(Icon.PLAY, {
                    on: {
                        click: _ => this._playItem(item)
                    }
                }),
                createElement('.collection-info', [
                    createElement('.collection-name', {
                        text: item.name || 'Unknown'
                    }),
                    createElement('', {
                        text: item.artist || 'Unknown'
                    }, this.type === 'album')
                ])
            ],
            on: {
                click: e => {
                    if (e.target.tagName !== 'I') {
                        if (this.type === 'album')
                            this.view.Node.outlet.render(Render.ALBUM(item.name), item.name, item.artist)
                        else
                            this.view.Node.outlet.render(Render.ARTIST(item.name), item.name)
                    }
                }
            },
            append: this.wrapper
        })
    }

    reset(items) {
        this.wrapper.innerHTML = ''
        this.items = items

        for (const item of this.items)
            this.createItem(item)
    }
}

customElements.define('collection-component', Collection)
module.exports = Collection