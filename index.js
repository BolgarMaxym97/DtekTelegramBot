const weekDays = {
    0: 'Понеділок',
    1: 'Вівторок',
    2: 'Середа',
    3: 'Четвер',
    4: 'Пʼятниця',
    5: 'Субота',
    6: 'Неділя',
};

const weekDaysMapping = {
    0: 6,
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5
};

const currentDay = new Date().getDay();
const currentHours = new Date().getHours() + 2;

const getMessageDaily = data => {
    let message = "Графік відключень %0A";

    data.map((schedule, day) => {
        const isDayMatched = +day === +weekDaysMapping[+currentDay];
        message += "%0A" + (isDayMatched ? "✓" : "") + weekDays[day] + ': ';
        schedule.map(timeData => {
            message += `з ${timeData.start} по ${timeData.end} | `;
        });
    });

    return message;
};

const getMessageHourly = data => {
    const todaysSchedule = data[currentDay]

    let message = "";

    todaysSchedule.map(item => {
        if (item.start === currentHours + 1) {
            message = `Не буде світла з ${item.start} по ${item.end}`;
        }
    });

    return message;
};

exports.handler = async (event) => {
    const https = require('https');

    const options = {
        'method': 'GET',
        'hostname': 'yasno.com.ua',
        'path': '/schedule-turn-off-electricity',
        'headers': {
            'accept': 'text/html,application/xhtml+xml',
            'cookie': 'incap_ses_768_2183478=GmV1dkz1VGf6n39IGHyoCmMOaGMAAAAAyhvbD7ffSky4ppumKhKmYw==; yasno_session=eyJpdiI6InVMdlF3VFdLRnVNSDRPN1ZPVWdzb2c9PSIsInZhbHVlIjoiUXkrRk5qcEppd0d2dUwrKzY0Zlk1U2FcL1MwdEJma25Va1RuZk1cLzJcL2QreVV5Z1Y0OWNCNHJ5MmRsNlpacEJPdVZ3NmpJdlNGUXczN2xpaDBkTFAza1k2MDBFUjdUMVhHZHVBajZtZVFISFVJdGtueWRMUW9UTHRlZWU0U1IycWciLCJtYWMiOiJkODhlMmZiYjliNTIxNWIzZGM2YzlmNTg0ZjI1NjA4YzI1NzUzYTFlODA4ODVkMGM0MjliNDgyYzFmMjBmYWYzIn0%3D;',
        },
    };

    const botToken = null;
    const chatId = null;

    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let chunks = [];

            res.on("data", chunk => {
                chunks.push(chunk);
            });

            res.on("end", chunk => {
                const body = Buffer.concat(chunks);
                const foundData = body.toString().match(/document.data\s?=\s?{.*}/)[0];
                if (!foundData) {
                    return;
                }
                const json = JSON.parse(foundData.replace(/document.data\s?=\s?/, ''));

                return new Promise(function (resolve, reject) {
                    const message = currentHours === 10 ? getMessageDaily(json.components[0].schedule.group_1) : getMessageHourly(json.components[0].schedule.group_1);

                    if (message.length !== 0) {
                        https.get(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&parse_mode=HTML&text=${message}`, res => {
                            resolve(res.statusCode);
                        }).on('error', (e) => {
                            reject(Error(e));
                        })
                    }

                })
            });

            res.on("error", error => {
                reject(error);
            });
        });

        req.end();
    });

};
