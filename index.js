const TelegramBot = require('node-telegram-bot-api');
const download = require('download')
const {
    parseString
} = require('xml2js');
const fs = require('fs')
const {
    YouTubeVideo
} = require("node-tube-dl")

const Token = process.env.TOKEN
const bot = new TelegramBot(Token, {
    polling: true
});

const {
    TiktokDL
} = require("@tobyg74/tiktok-api-dl")

const prefix = "."
const vtDownload = new RegExp(`^${prefix}vtDownload`)
const ytDownload = new RegExp(`^${prefix}ytDownload`)
const cuaca = new RegExp(`^${prefix}cuaca`)
const help = new RegExp(`^/help$`)
const start = new RegExp(`^/start$`)
const provinsi = new RegExp(`^/listprovinsi$`)
const gempa = new RegExp(`^${prefix}gempa$`)

bot.onText(vtDownload, async (callback) => {
    const {
        text,
        from: {
            id
        },
        chat
    } = callback
    const [command, url] = text.split(' ')

    if (url == undefined)
        bot.sendMessage(id, 'url tiktok diperlukan')

    try {
        const {
            result: {
                video: [videoResult1, videoResult2]
            }
        } = await TiktokDL(url, {
            version: "v1"
        })
        fs.writeFileSync(`files/${id}.mp4`, await download(videoResult2))
        bot.sendVideo(id, fs.readFileSync(`files/${id}.mp4`))
        fs.unlinkSync(`files/${id}.mp4`)
    } catch (error) {
        bot.sendMessage(id, 'terjadi kesalahan pada server. mohon coba lagi nanti')
        console.log(error)
    }
})

bot.onText(ytDownload, async (callback) => {
    const {
        text,
        from: {
            id
        },
        chat
    } = callback
    const [command, url] = text.split(' ')

    if (url == undefined)
        bot.sendMessage(id, 'url tiktok diperlukan')

    try {
        const myfolder = "files"
        const {
            videoPath
        } = await new YouTubeVideo(url)
            .quality("720p") // Available quality: 144p, 240p, 360p, 480p, 720p, 1080p
            .outdir(myfolder).filename(id)
            .download()
        bot.sendVideo(id, fs.readFileSync(videoPath))
        fs.unlinkSync(videoPath)

    } catch (error) {
        bot.sendMessage(id, 'terjadi kesalahan pada server. mohon coba lagi nanti')
        console.log(error)
    }

})

bot.onText(cuaca, async (callback) => {
    const {
        text,
        from: {
            id
        },
        chat
    } = callback
    const provinsi = text.split(' ');
    if (provinsi.length > 1) {
        let resProvinsi
        if (provinsi[1].includes('.')) {
            if (provinsi[2] == 'Bangka') {
                resProvinsi = provinsi[2] + provinsi[3]
            } else {
                resProvinsi = 'Kepulauan' + provinsi[1]
            }
        } else if (provinsi[2] != undefined) {
            resProvinsi = provinsi[1] + provinsi[2]
        } else {
            resProvinsi = provinsi[1]
        }

        let message = ''
        try {
            const api = await fetch(`https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/DigitalForecast-${resProvinsi}.xml`)
            const response = await api.text()
            const cuaca = setData(response)

            cuaca.map((value, index) => {
                message += `*Kota ${value.name}*
    Temperatur : ${value.data['Temperature']}
    Max Temperatur : ${value.data['Max']}
    Min Temperatur : ${value.data['Min']}
    Cuaca : ${getCuaca(value.data['Weather'])}${((cuaca.length - 1)!= index)?'\n\n':''}`
            })
        } catch (error) {
            message += 'inputan provinsi salah atau provinsi belum terdaftar pada sistem'
            console.log(error)
        }

        bot.sendMessage(id, message, {
            parse_mode: "MarkdownV2"
        })
    } else {
        bot.sendMessage(id, message, {
            parse_mode: "MarkdownV2"
        })
    }
})

bot.onText(help, async (callback) => {
    const {
        from: {
            id
        }
    } = callback
    bot.sendMessage(id, `
    \\-\\- list Fitur \\-\\-
*\\- media*
    \\.vtDownload _url_   \\=\\> download vt dan gambar
    \\.ytDownload _url_   \\=\\> download video youtube
*\\- BMKG*
    \\.cuaca _provinsi_   \\=\\> list cuaca
    \\.gempa   \\=\\> berita gempa terbaru
    `, {
        parse_mode: 'MarkdownV2'
    })
})

bot.onText(start, async (callback) => {
    const {
        from: {
            id
        }
    } = callback
    bot.sendMessage(id, `
Selamat Datang di TeleDL
Menggunakan bot ini anda dapat mengunduh video tiktok maupun video Youtube\\.
Dan anda juga bisa mendapatkan berita tentang cuaca maupun gempa terkini berdasarkan data dari BMKG\\.
Untuk lebih detailnya anda bisa menggunakan /help untuk melihat fitur yang tersedia dan /listprovinsi untuk melihat daftar provinsi yang ada diIndonesia\\.

    `, {
        parse_mode: 'MarkdownV2'
    })
})

bot.onText(provinsi, async (callback) => {
    const {
        from: {
            id
        }
    } = callback
    const listprovinsi = await listProvinsi()
    let message = '\\-\\-\\-\\-\\-\\-\\-\\- List Provinsi \\-\\-\\-\\-\\-\\-\\-\\- \n'
    listprovinsi.map((value, index) => {
        message += '\\-' + value.replace('.', '\\.') + '\n'
    })

    bot.sendMessage(id, message, {
        parse_mode: 'MarkdownV2'
    })
})

bot.onText(gempa, async (callback) => {
    const {
        from: {
            id
        }
    } = callback
    const data = await getGempa()
    bot.sendPhoto(id,
        `https://data.bmkg.go.id/DataMKG/TEWS/${data.Shakemap}`, {
            caption: `
Gempa Terbaru
Tanggal\t: ${data.Tanggal}
Jam\t: ${data.Jam}
Coordinate\t: ${data.Coordinates}
Magnitude\t: ${data.Magnitude}
Kedalaman\t: ${data.Kedalaman}
Wilayah\t: ${data.Wilayah}
Potensi\t: ${data.Potensi}`
        })
})



function setData(response) {
    const cuaca = []
    parseString(response, (err, result) => {
        const {
            data: {
                forecast: [{
                    area
                }]
            }
        } = result
        const data = JSON.stringify(area)
        const res = JSON.parse(data)
        const list = ['Temperature', 'Max temperature', 'Min temperature', 'Weather']
        res.map((value, index) => {
            temp = {}
            temp.id = value.$.id
            temp.name = value.$.description
            temp.data = {}
            if (value.parameter != undefined)
                value.parameter.map((val, ind) => {
                    if (list.includes(val.$.description)) {
                        tempName = (val.$.description).split(" ")
                        temp.data[tempName[0]] = val.timerange[1].value[0]._
                    }

                })
            cuaca.push(temp)
        })
    })
    return cuaca
}

async function listProvinsi() {
    const api = await fetch("https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/DigitalForecast-Indonesia.xml")
    const response = await api.text()
    const provinsi = []
    parseString(response, (err, result) => {
        const {
            data: {
                forecast: [{
                    area
                }]
            }
        } = result
        const data = JSON.stringify(area)
        const res = JSON.parse(data)
        res.map((value, index) => {
            provinsi.push(value.$.domain)
        })
    })
    return provinsi
}

function getCuaca(kode) {
    if (kode == 0)
        return 'Cerah'
    else if (kode == 1 || kode == 2)
        return 'Cerah Berawan'
    else if (kode == 3)
        return 'Berawan'
    else if (kode == 4)
        return 'Berawan Tebal'
    else if (kode == 5)
        return 'Udara Kabut'
    else if (kode == 10)
        return 'Berasap'
    else if (kode == 45)
        return 'Berkabut'
    else if (kode == 60)
        return 'Hujan Ringan'
    else if (kode == 61)
        return 'Hujan Sedang'
    else if (kode == 63)
        return 'Hujan Lebat'
    else if (kode == 80)
        return 'Hujan Lokal'
    else if (kode == 95 || kode == 97)
        return 'Hujan Petir'
    else
        return 'undefined'
}

async function getGempa() {
    const api = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json')
    const {
        Infogempa: {
            gempa: {
                Tanggal,
                Jam,
                Coordinates,
                Magnitude,
                Kedalaman,
                Wilayah,
                Potensi,
                Shakemap
            }
        }
    } = await api.json()
    return {
        Tanggal,
        Jam,
        Coordinates,
        Magnitude,
        Kedalaman,
        Wilayah,
        Potensi,
        Shakemap
    }
}