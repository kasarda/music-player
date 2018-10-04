
function createElement(name = '', props = {
    className: null,
    attr: null,
    prop: null,
    data: null,
    style: null,
    child: null,
    text: null,
    html: null,
    on: null
}) {

    const elemName = name.split('.')

    const element = document.createElement(elemName[0] || 'div')

    if (elemName.length > 1) {
        const classes = elemName.filter((_, i) => i !== 0)
        element.classList.add(...classes)
    }

    if (props.className) {
        let classes = props.className

        if (!(props.className instanceof Array))
            classes = [props.className]

        element.classList.add(...classes)
    }

    if (props.child) {
        if (props.child instanceof Array) {
            props.child
                .filter(child => child)
                .forEach(child => {
                    element.appendChild(child)
                })
        }
        else {
            element.appendChild(props.child)
        }
    }

    if (props.data) {
        for (const data in props.data) {
            const value = props.data[data]
            element.dataset[data] = value
        }
    }

    if (props.style) {
        for (const style in props.style) {
            const value = props.style[style]
            element.style[style] = value
        }
    }

    if (props.attr) {
        for (const attr in props.attr) {
            const value = props.attr[attr]
            element.setAttribute(attr, value)
        }
    }

    if (props.prop) {
        for (const prop in props.prop) {
            const value = props.prop[prop]
            element[prop] = value
        }
    }

    if(props.on) {
        for(const prop in props.on) {
            const listener = props.on[prop]
            element.addEventListener(prop, listener)
        }
    }

    if (props.text && !props.html)
        element.innerText = props.text
    else if (props.html)
        element.innerHTML = props.html

    return element
}


function createIcon(params = '') {
    const icon = document.createElement('i')
    const iconParams = params.split('.')
    icon.classList.add('material-icons')

    if (iconParams.length > 1) {
        const classes = iconParams.filter((_, i) => i !== 0)
        icon.classList.add(...classes)
    }

    icon.innerText = iconParams[0]

    return icon
}

function changeIcon(icon, new_icon) {
    icon.innerText = new_icon
}


module.exports = {
    changeIcon,
    createElement,
    createIcon
}
