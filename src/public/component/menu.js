const { createElement } = require('../lib/common')
const { remote } = require('electron')
const win = remote.getCurrentWindow()

function svg(name) {
    return `
        <svg width="11" height="11" viewBox="0 0 11 11">
            <use xlink:href="#${name}-icon">
        </svg>
    `
}


class Menu extends HTMLElement {
    constructor() {
        super()

        createElement('.menu-drag.resize-space', {
            append: this
        })

        this.maximizeButton = createElement('.menu-button', {
            html: win.isMaximized() ? svg('unmaximize') : svg('maximize'),
            on: {
                click: _ => {
                    if (win.isMaximized()) {
                        win.unmaximize()
                        this.maximizeIcon()
                    }
                    else {
                        win.maximize()
                        this.unmaximizeIcon()
                    }
                }
            }
        })

        createElement('.menu-container', {
            child: [
                createElement('.menu-title', {
                    text: document.title
                }),
                createElement('.menu-controllers', [
                    createElement('.menu-button', {
                        html: svg('minimize'),
                        on: {
                            click: _ => win.minimize(),
                        }
                    }),
                    this.maximizeButton,
                    createElement('.menu-button.danger', {
                        html: svg('close'),
                        on: {
                            click: _ => win.close()
                        }
                    })
                ])
            ],
            append: this
        })


        win.on('maximize', _ => this.unmaximizeIcon())
        win.on('unmaximize', _ => this.maximizeIcon())


        document.body.insertBefore(this, document.body.firstChild || null)
    }

    maximizeIcon() {
        this.maximizeButton.innerHTML = svg('maximize')
    }

    unmaximizeIcon() {
        this.maximizeButton.innerHTML = svg('unmaximize')
    }

}


customElements.define('menu-component', Menu)
module.exports = Menu