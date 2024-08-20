const fs = require('fs');
const axios = require('axios');
const colors = require('colors');
const { DateTime } = require('luxon');
const { HttpsProxyAgent } = require('https-proxy-agent');

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

    loadProxies(file) {
        const proxies = fs.readFileSync(file, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        if (proxies.length <= 0) {
            console.log(colors.red(`No proxies found`));
            process.exit();
        }
        return proxies;
    }
    
    async http(url, headers, data = null, proxy = null) {
        try {
            let res;
            const config = { headers };
    
            if (proxy) {
                config.httpAgent = new HttpsProxyAgent(proxy);
                config.httpsAgent = new HttpsProxyAgent(proxy);
            }
    
            if (!data) {
                res = await axios.get(url, config);
            } else if (data === '') {
                res = await axios.post(url, null, config);
            } else {
                res = await axios.post(url, data, config);
            }
            return res;
        } catch (error) {
            this.log('Connection error', 'red');
            throw new Error(error.message);
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
                        this.log(`Day ${data.lastCheckinDay} reward:`, 'yellow');
                        this.log(`- ${reward.tokenReward} WTON`, 'green');
                        this.log(`- ${reward.ticketReward} ticket`, 'green');
                    }
                } else {
                    this.log('You have already checked in today.', 'yellow');
                }
                
                return data;
            } else {
                this.log(`Unable to check-in. Status code: ${res.status}`, 'red');
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
                    this.log(`${colors.green('Farming is in progress. Finish time:')} ${colors.white(finishTime.toFormat('dd/MM/yyyy HH:mm:ss'))}`, 'white');
                    return data;
                } else {
                    return 'claim'; 
                }
            } else {
                this.log(`Unable to check farming status. Status code: ${res.status}`, 'red');
                return null;
            }
        } catch (error) {
            this.log(`Error checking farming status: ${error.message}`, 'red');
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
                this.log(`Unable to claim farming reward. Status code: ${res.status}`, 'red');
                return null;
            }
        } catch (error) {
            this.log(`Error claiming farming reward: ${error.message}`, 'red');
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
                this.log(`${colors.green('Farming finish time:')} ${colors.white(finishTime.toFormat('dd/MM/yyyy HH:mm:ss'))}`, 'white');
                return data;
            } else {
                this.log(`Unable to start farming. Status code: ${res.status}`, 'red');
                return null;
            }
        } catch (error) {
            this.log(`Error starting farming: ${error.message}`, 'red');
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
                this.log(`Unable to start game. Status code: ${res.status}`, 'red');
                return null;
            }
        } catch (error) {
            this.log(`Error starting game: ${error.message}`, 'red');
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
                this.log(`${colors.yellow('Received WTON:')} ${colors.white(points)}`, 'white');
                this.log(`${colors.yellow('Bonus:')} ${colors.white(hasBonus)}`, 'white');
    
                if (responseData.items && responseData.items.length > 0) {
                    this.log('You received the following items:', 'green');
                    responseData.items.forEach(item => {
                        this.log(`${item.name} Farming speed ${item.farmingPower} | ${item.tokenValue} WTON | ${item.value} TON`, 'green');
    
                        if (item.value > 0) {
                            this.log(`You can withdraw ${item.value} TON.`, 'yellow');
                        }
                    });
                }
    
                return responseData;
            } else {
                this.log(`Unable to finish game. Status code: ${res.status}`, 'red');
                return null;
            }
        } catch (error) {
            this.log(`Error finishing game: ${error.message}`, 'red');
            return null;
        }
    }

    async start(token) {
        this.log('Loading proxy list');
        const proxies = this.loadProxies('./proxies.txt');
    
        this.log('Starting check-in');
        const checkinResult = await this.checkin(token);
    
        if (checkinResult) {
            for (let i = 0; i < proxies.length; i++) {
                try {
                    const proxy = proxies[i];
    
                    this.log(`Checking farming status with proxy ${i + 1}/${proxies.length}`);
                    const farmingStatus = await this.checkFarmingStatus(token);
    
                    if (farmingStatus === 'claim') {
                        this.log('Claiming farming reward');
                        const claimResult = await this.claimFarming(token);
    
                        if (claimResult) {
                            this.log('Starting new farming session');
                            await this.startFarming(token);
                        }
                    } else if (!farmingStatus) {
                        this.log('Starting farming');
                        await this.startFarming(token);
                    }
    
                    this.log(`Starting game with proxy ${i + 1}/${proxies.length}`);
                    const gameStartResult = await this.startGame(token);
    
                    if (gameStartResult) {
                        await this.finishGame(token, gameStartResult.points, gameStartResult.bonusRound);
                    }
    
                    this.log(`Completed operations with proxy ${i + 1}/${proxies.length}`, 'yellow');
                } catch (error) {
                    this.log(`Error during operations with proxy ${i + 1}/${proxies.length}: ${error.message}`, 'red');
                }
    
                if (i < proxies.length - 1) {
                    this.log('Waiting before switching to next proxy');
                    await this.countdown(60);  // Countdown for 1 minute
                }
            }
        }
    }
}

module.exports = XPlusApp;
