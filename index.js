const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// ترويسات كسر الحماية الأمنية لمشغل تويتر
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// استقبال طلبات ملفات الفيديو الثقيلة وتمريرها من آي بي نظيف وبلا تقطيع
app.get('/stream-ts', async (req, res) => {
    const vidUrl = req.query.vid_url;
    if (!vidUrl) return res.status(400).send('Missing vid_url parameter');

    try {
        const targetObj = new URL(vidUrl);
        const base = targetObj.protocol + '//' + targetObj.host;

        // بناء الهوية الكاملة لخداع السيرفر المصدر
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'Referer': base + '/',
            'Origin': base
        };

        // تمرير طلبات الـ Range الخاصة بتويتر لضمان صفر تقطيع
        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        // توليد آي بي تمويهي ديناميكي
        const randomIp = `${Math.floor(Math.random() * 220) + 11}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`;
        headers['X-Forwarded-For'] = randomIp;
        headers['X-Real-IP'] = randomIp;

        const response = await axios({
            method: 'get',
            url: vidUrl,
            headers: headers,
            responseType: 'stream'
        });

        // تمرير الـ Content-Type والـ Status الصحيح للمشغل
        res.setHeader('Content-Type', 'video/mp2t');
        if (response.headers['content-range']) {
            res.setHeader('Content-Range', response.headers['content-range']);
            res.status(206);
        }

        // ضخ البيانات مباشرة لتويتر دون استهلاك معالج أو رام
        response.data.pipe(res);

    } catch (e) {
        res.status(500).send('Proxy Stream Error: ' + e.message);
    }
});

app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
