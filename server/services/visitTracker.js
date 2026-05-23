const Visitor = require('../models/Visitor');

const geoCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         '0.0.0.0';
}

async function getGeolocation(ip) {
  // Check cache first
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { country: cached.country, city: cached.city };
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();

    if (data.status === 'success') {
      const geo = {
        country: data.country || 'Unknown',
        city: data.city || ''
      };
      geoCache.set(ip, { ...geo, timestamp: Date.now() });
      return geo;
    }
  } catch (err) {
    console.error('Geolocation error:', err.message);
  }

  return { country: 'Unknown', city: '' };
}

async function trackVisit(ip, page, userAgent) {
  if (!ip || ip === '0.0.0.0' || ip === '::1') return;

  const geo = await getGeolocation(ip);

  try {
    const visitor = await Visitor.findOne({ ip });

    if (visitor) {
      // Update existing visitor
      visitor.visits += 1;
      visitor.lastSeen = new Date();
      visitor.userAgent = userAgent;
      if (!visitor.pages.includes(page)) {
        visitor.pages.push(page);
      }
      await visitor.save();
    } else {
      // Create new visitor
      await Visitor.create({
        ip,
        userAgent,
        country: geo.country,
        city: geo.city,
        visits: 1,
        pages: [page]
      });
    }
  } catch (err) {
    console.error('Track visit error:', err.message);
  }
}

async function getAnalytics() {
  try {
    const visitors = await Visitor.find().lean();
    const totalVisitors = visitors.length;
    const totalVisits = visitors.reduce((sum, v) => sum + v.visits, 0);

    // Aggregate pages
    const pageMap = {};
    visitors.forEach(v => {
      v.pages.forEach(page => {
        pageMap[page] = (pageMap[page] || 0) + 1;
      });
    });
    const topPages = Object.entries(pageMap)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent visitors
    const recentVisitors = visitors
      .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
      .slice(0, 50)
      .map(v => ({
        ip: v.ip,
        country: v.country,
        city: v.city,
        visits: v.visits,
        pages: v.pages,
        lastSeen: v.lastSeen,
        userAgent: v.userAgent
      }));

    return {
      totalVisitors,
      totalVisits,
      topPages,
      recentVisitors,
      avgVisitsPerPerson: (totalVisits / totalVisitors).toFixed(2)
    };
  } catch (err) {
    console.error('Analytics error:', err.message);
    return {
      totalVisitors: 0,
      totalVisits: 0,
      topPages: [],
      recentVisitors: [],
      avgVisitsPerPerson: 0
    };
  }
}

module.exports = {
  getClientIP,
  getGeolocation,
  trackVisit,
  getAnalytics
};
