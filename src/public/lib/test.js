
class Output {
    static info(data) {
        Output.style(data, 'blue')
    }

    static success(data) {
        Output.style(data, 'green')
    }

    static error(data) {
        Output.style(data, 'red')
    }

    static style(data, color, size=null) {
        if (typeof data === 'string')
            console.log('%c' + data, `color: ${color}; ${size ? `font-size: ${size}`: ''}`)
        else
            console.log(data)
    }
}

class $Test {
    static run(name, fn) {
        Output.info('START ' + name)
        const promise = new Promise(fn)

        return promise.then((...data) => {
            Output.success(`\t😺 TEST PASS =>`)
            if (data.length)
                console.log(...data)
            Output.info('END ' + name)
            console.log('\n')
        }).catch((...data) => {
            Output.error(`\t😿 TEST FAILED => `)
            if (data.length)
                console.log(...data)
            Output.info('END ' + name)
            console.log('\n')
        })
    }

    static delay(time) {
        return new Promise(resolve => {
            setTimeout(_ => {
                resolve()
            }, time)
        })
    }

    static repeat(count, time, fn) {
        let i = 1

        const interval = setInterval(_ => {
            fn(i)
            i++
            if(i > count) {
                clearInterval(interval)
            }
        }, time)
    }

    static start(name, fn) {
        Output.style('START TEST ' + name, 'orange', '18px')
        return fn
    }
}


module.exports = $Test