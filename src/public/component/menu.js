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

        const maximizeButton = createElement('.menu-button', {
            html: svg('maximize'),
            on: {
                click: _ => {
                    if (win.isMaximized())
                        win.unmaximize()
                    else
                        win.maximize()
                }
            }
        })


        createElement('.menu-container', {
            child: [
                createElement('.menu-title', document.title),
                createElement('.menu-controllers', [
                    createElement('.menu-button', {
                        html: svg('minimize'),
                        on: {
                            click: _ => win.minimize(),
                        }
                    }),
                    maximizeButton,
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


        win.on('maximize', _ => {
            maximizeButton.innerHTML = svg('unmaximize')
        })

        win.on('unmaximize', _ => {
            maximizeButton.innerHTML = svg('maximize')
        })

        document.body.insertBefore(this, document.body.firstChild || null)
    }

}


customElements.define('menu-component', Menu)
module.exports = Menu