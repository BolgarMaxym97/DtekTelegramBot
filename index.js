const GROUPS_CHATS = {
    1: null,
    2: null,
    3: null,
};

const botToken = '';

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
const currentMinutes = new Date().getMinutes();

const getMessageDaily = data => {
    let message = "<b>💡Графік відключень💡</b> %0A";

    message += '⚠️ - можливе відключення; %0A'
    message += '🚫 - eлектроенергії немає; %0A'

    data.map((schedule, day) => {
        const isDayMatched = +day === +weekDaysMapping[+currentDay];
        if (!isDayMatched && +currentDay !== 1) {
            return;
        }
        const isMatchedDaySymbol = (isDayMatched ? "✅" : "");
        message += "%0A" + isMatchedDaySymbol + `<b>${weekDays[day]}</b>` + isMatchedDaySymbol + ': ';
        schedule.map(timeData => {
            message += `%0Aз ${timeData.start} по ${timeData.end} ${timeData.type === "DEFINITE_OUTAGE" ? '🚫' : '⚠️'}`;
        });
    });

    return message;
};

const getMessageHourly = data => {
    const todaysSchedule = data[+weekDaysMapping[+currentDay]]

    let message = "";

    todaysSchedule.map(item => {
        if (item.start === currentHours + 1) {
            message = `${item.type === "DEFINITE_OUTAGE" ? 'Не' : 'Можливо не'} буде eлектроенергії з ${item.start} по ${item.end}`;
        }
    });

    return message;
};

const getSchedule = (json, groupId) => {
    const schedule = json.components[0].schedule || json.components[1].schedule;
    return schedule.kiev[`group_${groupId}`];
};

exports.handler = async (event) => {
    const https = require('https');

    const options = {
        'method': 'GET',
        'hostname': 'yasno.com.ua',
        'path': '/schedule-turn-off-electricity',
        'headers': {
            'accept': 'text/html,application/xhtml+xml',
            'cookie': 'incap_ses_763_2183478=tBQ7WTf0AUt60IFgNrmWCsvHb2MAAAAAhS48J%2F38oY83tUyaD1L%2FGw%3D%3D; yasno_session=eyJpdiI6IkdUMkJ6c2hkaEJnVjBzSVFWVld0TWc9PSIsInZhbHVlIjoiWGJpbWRUWkU3SUNxV2Y0Z2FoamQzQUVxVWhGRUR0M2FTSEVZeEF5SU50dEs2RGROdXloQkREazF1N3IzZjh2YjUxRFBISENtOXFEMVhTaEd2SVJSYWtqb3BMUHpqVjk4QXRDOUpEUlNadjF2RWhaWHlPNkFSblE0SlhKSWk2V3ciLCJtYWMiOiI4ZjY5MWE3NDQ3NjE3N2U4Njk3YmYzODdkYzkzM2E2ODQxNjBlYmM4OTQ5YTY0YTQ4ZmY2YjM4MzU5NzU4OGRkIn0%3D;',
        },
    };


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
                const isDailyMessage = currentHours === 10 && currentMinutes < 30;
                const promises = [];

                Object.values(GROUPS_CHATS).map((chatId, index) => {
                    const groupId = Object.keys(GROUPS_CHATS)[index];

                    promises.push(new Promise(function (resolve, reject) {
                        const schedule = getSchedule(json, groupId);
                        const message = isDailyMessage ? getMessageDaily(schedule) : getMessageHourly(schedule);

                        if (message.length !== 0) {
                            https.get(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&parse_mode=html&text=${message}`, res => {
                                resolve(res.statusCode);
                            }).on('error', (e) => {
                                reject(Error(e));
                            })
                        }

                    }));
                });

                return Promise.all(promises);

            });

            res.on("error", error => {
                reject(error);
            });
        });

        req.end();
    });

};

exports.handler({});