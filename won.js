const fs = require('fs');
const axios = require('axios');
const colors = require('colors');
const { DateTime } = require('luxon');

class XPlusApp {
    constructor() {
        this.headers = {
            'authority': 'prod-dot-xplus-mon.de.r.appspot.com',
            'accept': '*/*',
            'accept-language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'content-type': 'application/json',
            'origin': 'https://wonton-frontend.pages.dev',
            'referer': 'https://wonton-frontend.pages.dev/',
            'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        };
    }

    async countdown(t) {
        for (let i = t; i > 0; i--) {
            const hours = String(Math.floor(i / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((i % 3600) / 60)).padStart(2, '0');
            const seconds = String(i % 60).padStart(2, '0');
            process.stdout.write(colors.yellow(`[*] Need to wait ${hours}:${minutes}:${seconds}     \r`));
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        process.stdout.write('                                        \r');
    }

    log(msg, color = 'white') {
        console.log(colors[color](`[*] ${msg}`));
    }

    async http(url, headers, data = null) {
        while (true) {
            try {
                let res;
                if (!data) {
                    res = await axios.get(url, { headers });
                } else if (data === '') {
                    res = await axios.post(url, null, { headers });
                } else {
                    res = await axios.post(url, data, { headers });
                }
                return res;
            } catch (error) {
                console.log(error);
                this.log('Connection error', 'red');
                await this.countdown(1);
            }
        }
    }

    async checkin(token) {
        const url = 'https://prod-dot-xplus-mon.de.r.appspot.com/api/v1/checkin';
        const headers = {
            ...this.headers,
            'Authorization': `bearer ${token}`
        };

        try {
            const res = await this.http(url, headers);
            if (res.status === 200) {
                const data = res.data;
                this.log('Check-in successful!', 'green');
                this.log(`Last check-in day: ${data.lastCheckinDay}`, 'yellow');
                
                if (data.newCheckin) {
                    const reward = data.configs.find(config => config.day === data.lastCheckinDay);
                    if (reward) {
                        this.log(`Reward for day ${data.lastCheckinDay}:`, 'yellow');
                        this.log(`- ${reward.tokenReward} WTON`, 'green');
                        this.log(`- ${reward.ticketReward} ticket`, 'green');
                    }
                } else {
                    this.log('You have already checked in today.', 'yellow');
                }
                
                return data;
            } else {
                this.log(`Check-in failed. Status code: ${res.status}`, 'red');
                return null;
            }
        } catch (error) {
            this.log(`Error during check-in: ${error.message}`, 'red');
            return null;
        }
    }
    
    async checkFarmingStatus(token) {
        const url = 'https://prod-dot-xplus-mon.de.r.appspot.com/api/v1/user/farming-status';
        const headers = {
            ...this.headers,
            'Authorization': `bearer ${token}`
        };

        try {
            const res = await this.http(url, headers);
            if (res.status === 200) {
                const data = res.data;
                if (Object.keys(data).length === 0) {
                    return null;
                }
                
                const now = DateTime.now();
                const finishTime = DateTime.fromISO(data.finishAt);
                
                if (now < finishTime) {
                    this.log(`${colors.green('Farming is in progress. Completion time:')} ${colors.white(finishTime.toFormat('dd/MM/yyyy HH:mm:ss'))}`, 'white');
                    return data;
                } else {
                    return 'claim'; 
                }
            } else {
                this.log(`Failed to check farming status. Status code: ${res.status}`, 'red');
                return null;
            }
        } catch (error) {
            this.log(`Error during farming status check: ${error.message}`, 'red');
            return null;
        }
    }

    async claimFarming(token) {
        const url = 'https://prod-dot-xplus-mon.de.r.appspot.com/api/v1/user/farming-claim';
        const headers = {
            ...this.headers,
            'Authorization': `bearer ${token}`
        };

        try {
            const res = await this.http(url, headers, {});
            if (res.status === 200) {
                const data = res.data;
                this.log('Successfully claimed farming reward', 'green');
                return data;
            } else {
                this.log(`Failed to claim farming reward. Status code: ${res.status}`, 'red');
                return null;
            }
        } catch (error) {
            this.log(`Error during farming reward claim: ${error.message}`, 'red');
            return null;
        }
    }

    async startFarming(token) {
        const url = 'https://prod-dot-xplus-mon.de.r.appspot.com/api/v1/user/start-farming';
        const headers = {
            ...this.headers,
            'Authorization': `bearer ${token}`
        };

        try {
            const res = await this.http(url, headers, {});
            if (res.status === 200) {
                const data = res.data;
                this.log('Farming started successfully', 'green');
                const finishTime = DateTime.fromISO(data.finishAt).setZone('local');
                this.log(`${colors.green('Farming completion time:')} ${colors.white(finishTime.toFormat('dd/MM/yyyy HH:mm:ss'))}`, 'white');
                return data;
            } else {
                this.log(`Failed to start farming. Status code: ${res.status}`, 'red');
                return null;
            }
        } catch (error) {
            this.log(`Error during farming start: ${error.message}`, 'red');
            return null;
        }
    }

    async startGame(token) {
        const url = 'https://prod-dot-xplus-mon.de.r.appspot.com/api/v1/user/start-game';
        const headers = {
            ...this.headers,
            'Authorization': `bearer ${token}`
        };
    
        try {
            const res = await this.http(url, headers, {});
            if (res.status === 200) {
                const data = res.data;
                this.log('Game started successfully', 'green');
                this.log(`Bonus Round: ${data.bonusRound}`, 'yellow');
                return data;
            } else {
                this.log(`Failed to start game. Status code: ${res.status}`, 'red');
                return null;
            }
        } catch (error) {
            this.log(`Error during game start: ${error.message}`, 'red');
            return null;
        }
    }
    
    async finishGame(token, points, hasBonus) {
        const url = 'https://prod-dot-xplus-mon.de.r.appspot.com/api/v1/user/finish-game';
        const headers = {
            ...this.headers,
            'Authorization': `bearer ${token}`
        };
        const data = JSON.stringify({ points, hasBonus });
    
        try {
            const res = await this.http(url, headers, data);
            if (res.status === 200) {
                const responseData = res.data;
    
                this.log('Game finished successfully', 'green');
                this.log(`${colors.yellow('WTON earned:')} ${colors.white(points)}`, 'white');
                this.log(`${colors.yellow('Bonus:')} ${colors.white(hasBonus)}`, 'white');
    
                if (responseData.items && responseData.items.length > 0) {
                    this.log('You received the following items:', 'green');
                    responseData.items.forEach(item => {
                        this.log(`${item.name} Farming speed ${item.farmingPower} | ${item.tokenValue} WTON | ${item.value} TON`, 'green');
    
                        if (item.value > 0) {
                            this.saveItemToFile(token, item);
                        }
                    });
                } else {
                    this.log('No items received.', 'yellow');
                }
    
                return responseData;
            } else {
                this.log(`Failed to finish game. Status code: ${res.status}`, 'red');
                return null;
            }
        } catch (error) {
            this.log(`Error during game finish: ${error.message}`, 'red');
            return null;
        }
    }    
    
    async getTaskProgress(token) {
        const url = 'https://prod-dot-xplus-mon.de.r.appspot.com/api/v1/user/task-progress';
        const headers = {
            ...this.headers,
            'Authorization': `bearer ${token}`
        };

        try {
            const res = await this.http(url, headers);
            if (res.status === 200) {
                const data = res.data;
                this.log('Task progress retrieved successfully', 'green');
                return data;
            } else {
                this.log(`Failed to retrieve task progress. Status code: ${res.status}`, 'red');
                return null;
            }
        } catch (error) {
            this.log(`Error during task progress retrieval: ${error.message}`, 'red');
            return null;
        }
    }

    async saveItemToFile(token, item) {
        const fileName = 'items.txt';
        const itemString = `Bearer token: ${token}, Item: ${JSON.stringify(item)}\n`;
        
        try {
            fs.appendFileSync(fileName, itemString);
            this.log(`Saved item to file: ${item.name}`, 'green');
        } catch (error) {
            this.log(`Failed to save item to file: ${error.message}`, 'red');
        }
    }
}

(async () => {
    const app = new XPlusApp();
    const token = 'Bearer-token';
    
    let farmingStatus = await app.checkFarmingStatus(token);

    if (farmingStatus === 'claim') {
        await app.claimFarming(token);
        await app.startFarming(token);
    } else if (farmingStatus === null) {
        await app.startFarming(token);
    }

    await app.checkin(token);
    
    await app.startGame(token);
    
    const taskProgress = await app.getTaskProgress(token);
    console.log(taskProgress);
})();
