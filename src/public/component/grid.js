const { createElement, createIcon } = require('../lib/query')
const { getImmutable, Icon } = require('../lib/common')

const default_item = {
    title: '',
    subtitle: '',
    poster: null,
    action: null
}

class GridComponent extends HTMLElement {
    constructor(option = []) {
        super()
        /* Properties */
        this.option = option.map(this._setItem)
        this.noresult = false
        this._addEvent = new CustomEvent('add', { detail: {} })
        this._removeEvent = new CustomEvent('remove', { detail: {} })
        this._filteredText = null
        /* DOM */
        this.content = createElement('section')
        this._noresult = createElement('.noresult', {
            text: 'No result'
        })

        this.appendChild(this.content)
        this.appendChild(this._noresult)

        this.option.forEach(prop => {
            this._addItem(prop)
        })
    }

    get _items() {
        return this.querySelectorAll('.item')
    }

    addItem(item) {
        item = this._setItem(item)
        this.option.push(item)
        this._addItem(item)
        this._addEvent.detail.item = item
        this.dispatchEvent(this._addEvent)

        if (this._filteredText)
            this.filter(this._filteredText)
    }

    removeItem(index) {
        this._removeEvent.detail.item = this.option[index]
        this.option.splice(index, 1)
        this._items[index].remove()
        this.dispatchEvent(this._removeEvent)
    }

    filter(text) {
        text = text.toLowerCase().replace(/ /g, '')
        this._filteredText = text
        this.option.forEach((prop, position) => {
            const filter_text = (prop.title + prop.subtitle).toLowerCase().replace(/ /g, '')
            if (!filter_text.includes(text))
                this._items[position].style.display = 'none'
            else
                this._items[position].style.display = ''
        })

        const filteredItems = Array.from(this._items).filter(row => {
            return row.style.display !== 'none'
        })
        if (!filteredItems.length) {
            this._noresult.style.display = 'block'
            this.noresult = true
        }
        else {
            this._noresult.style.display = 'none'
            this.noresult = false
        }
    }

    getItems() {
        return this.option
    }

    _addItem(item) {
        const itemElement = createElement('.item')
        const titleWrapper = createElement('.title')

        if (item.title) {
            const title = createElement('div', {
                text: item.title
            })
            titleWrapper.appendChild(title)
        }

        if (item.subtitle) {
            const subtitle = createElement('div', {
                text: item.subtitle
            })
            titleWrapper.appendChild(subtitle)
        }

        if (item.poster) {
            const poster = new Image()
            poster.src = item.poster
            itemElement.appendChild(poster)
        }

        if (item.action) {
            itemElement.addEventListener('click', _ => {
                item.action.call(itemElement, this)
            })
        }

        const play = createIcon(Icon.PLAY + '.extra-large')
        itemElement.appendChild(play)

        itemElement.appendChild(titleWrapper)
        this.content.appendChild(itemElement)
    }

    _setItem(item) {
        return getImmutable(default_item, item)
    }
}

customElements.define('grid-component', GridComponent)
module.exports = GridComponent



// const option = [
//     {
//         title: 'Drake',
//         subtitle: 'More life',
//         poster: Asset('more_life.jpg'),
//         action(event) {
//             console.log(this, event)
//         }
//     },
//     {
//         title: 'The Weeknd',
//         subtitle: 'Star boy',
//         poster: Asset('more_life.jpg')
//     },
//     {
//         title: 'Lana Del Ray',
//         subtitle: 'Video Game',
//         poster: Asset('more_life.jpg')
//     },
//     {
//         title: 'Filip Kasarda',
//         subtitle: 'Javascript'
//     },
//     {
//         title: 'Drake',
//         subtitle: 'more Life',
//         poster: Asset('more_life.jpg')
//     },
//     {
//         title: 'Drake',
//         subtitle: 'more Life',
//         poster: Asset('more_life.jpg')
//     }
// ]

// const grid = new GridComponent(option)


// grid.addEventListener('remove', _ => {
//     console.log(_.detail)
// })

// document.body.appendChild(grid)