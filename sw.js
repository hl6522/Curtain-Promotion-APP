const CACHE_NAME = 'whl-curtains-v1.0.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const IMAGE_CACHE = 'image-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/mobile.html',
  '/index.html',
  '/catalog.html',
  '/fullscreen.html',
  '/manifest.json',
  '/sw.js',
  '/Icons/facebook.svg',
  '/Icons/tiktok.svg',
  '/Icons/youtube.svg',
  '/Music/Pufino - Harmony (freetouse.com).mp3',
  '/Music/Lukrembo - Bread (freetouse.com).mp3'
];

// 需要缓存的图片资源
const IMAGE_ASSETS = [
  '/Products/WHL窗帘-枝叶绣.jpg',
  '/Products/云花轻梦-灰白.jpg',
  '/Products/凡尔赛-雾灰.jpg',
  '/Products/半夏棉麻.jpg',
  '/Products/卵石海岸.jpg',
  '/Products/幕洛编织麻.jpg',
  '/Products/弗特伊-暮金.jpg',
  '/Products/弗特伊-雾灰.jpg',
  '/Products/斑马帘.jpg',
  '/Products/旷野-米咖.jpg',
  '/Products/松叶绣雪尼尔.jpg',
  '/Products/枝叶绣-雾蓝.jpg',
  '/Products/树纹纱.jpg',
  '/Products/梦幻帘.jpg',
  '/Products/森镜林语-沉棕.jpg',
  '/Products/流光纱.jpg',
  '/Products/狂野-墨绿.jpg',
  '/Products/窗纱.jpg',
  '/Products/米洛缇.jpg',
  '/Products/线格纱-柔白.jpg',
  '/Products/繁枝镜面纱.jpg',
  '/Products/繁花-桃粉.jpg',
  '/Products/罗马帘.jpg',
  '/Products/美丽奴.jpg',
  '/Products/翠微竹韵-金缎.jpg',
  '/Products/翠微竹韵-银雾.jpg',
  '/Products/茹伊丛林.jpg',
  '/Products/莫言亚光.jpg',
  '/Products/菱形纱.jpg',
  '/Products/蜂巢帘.jpg',
  '/Products/风沙流影.jpg',
  '/Products/香格里拉帘.jpg',
  '/Products/香榭丽.jpg'
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('Service Worker 安装中...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('缓存静态资源...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('静态资源缓存完成');
        return caches.open(IMAGE_CACHE);
      })
      .then((cache) => {
        console.log('缓存图片资源...');
        return cache.addAll(IMAGE_ASSETS);
      })
      .then(() => {
        console.log('图片资源缓存完成');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('缓存失败:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker 激活中...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== IMAGE_CACHE) {
              console.log('删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('旧缓存清理完成');
        return self.clients.claim();
      })
  );
});

// 拦截网络请求 - 缓存优先策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非GET请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过Chrome扩展等非HTTP请求
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 跳过Service Worker自身
  if (url.pathname === '/sw.js') {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          // 返回缓存的响应
          return response;
        }

        // 如果缓存中没有，则从网络获取
        return fetch(request)
          .then((networkResponse) => {
            // 检查响应是否有效
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // 克隆响应以便缓存
            const responseToCache = networkResponse.clone();

            // 根据资源类型选择缓存策略
            if (request.destination === 'image' || url.pathname.includes('/Products/')) {
              // 图片资源使用图片缓存
              caches.open(IMAGE_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            } else if (request.destination === 'audio' || url.pathname.includes('/Music/')) {
              // 音频资源使用动态缓存
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            } else if (request.destination === 'document' || request.destination === 'script' || request.destination === 'style') {
              // 文档、脚本、样式使用静态缓存
              caches.open(STATIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }

            return networkResponse;
          })
          .catch(() => {
            // 网络请求失败时的降级处理
            if (request.destination === 'image') {
              // 返回默认图片
              return caches.match('/Icons/default-image.png');
            } else if (request.destination === 'document') {
              // 返回离线页面
              return caches.match('/offline.html');
            }
            return new Response('网络请求失败', { status: 503 });
          });
      })
  );
});

// 后台同步 - 预加载重要资源
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      caches.open(IMAGE_CACHE)
        .then((cache) => {
          // 预加载一些重要的图片资源
          return cache.addAll(IMAGE_ASSETS.slice(0, 10));
        })
        .catch((error) => {
          console.error('后台同步失败:', error);
        })
    );
  }
});

// 推送通知处理
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'WHL窗帘有新消息',
    icon: '/Icons/icon-192x192.png',
    badge: '/Icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
        icon: '/Icons/explore-icon.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/Icons/close-icon.png'
      }
    ],
    requireInteraction: true,
    tag: 'whl-notification'
  };

  event.waitUntil(
    self.registration.showNotification('WHL窗帘', options)
  );
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/mobile.html')
    );
  } else if (event.action === 'close') {
    // 关闭通知，不做任何操作
  } else {
    // 默认点击行为 - 打开应用
    event.waitUntil(
      clients.openWindow('/mobile.html')
    );
  }
});

// 消息处理 - 用于与主线程通信
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// 错误处理
self.addEventListener('error', (event) => {
  console.error('Service Worker 错误:', event.error);
});

// 未处理的Promise拒绝
self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker 未处理的Promise拒绝:', event.reason);
});

// 定期清理过期缓存
setInterval(() => {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== IMAGE_CACHE) {
        caches.delete(cacheName);
      }
    });
  });
}, 24 * 60 * 60 * 1000); // 每24小时清理一次
=======
const CACHE_NAME = 'whl-curtains-v1.0.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const IMAGE_CACHE = 'image-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/mobile.html',
  '/index.html',
  '/catalog.html',
  '/fullscreen.html',
  '/manifest.json',
  '/sw.js',
  '/Icons/facebook.svg',
  '/Icons/tiktok.svg',
  '/Icons/youtube.svg',
  '/Music/Pufino - Harmony (freetouse.com).mp3',
  '/Music/Lukrembo - Bread (freetouse.com).mp3'
];

// 需要缓存的图片资源
const IMAGE_ASSETS = [
  '/Products/WHL窗帘-枝叶绣.jpg',
  '/Products/云花轻梦-灰白.jpg',
  '/Products/凡尔赛-雾灰.JPG',
  '/Products/半夏棉麻.jpg',
  '/Products/卵石海岸.jpg',
  '/Products/幕洛编织麻.jpg',
  '/Products/弗特伊-暮金.jpg',
  '/Products/弗特伊-雾灰.jpg',
  '/Products/斑马帘.JPG',
  '/Products/旷野-米咖.JPG',
  '/Products/松叶绣雪尼尔.jpg',
  '/Products/枝叶绣-雾蓝.jpg',
  '/Products/树纹纱.jpg',
  '/Products/梦幻帘.jpg',
  '/Products/森镜林语-沉棕.jpg',
  '/Products/流光纱.jpg',
  '/Products/狂野-墨绿.jpg',
  '/Products/窗纱.jpg',
  '/Products/米洛缇.jpg',
  '/Products/线格纱-柔白.jpg',
  '/Products/繁枝镜面纱.jpg',
  '/Products/繁花-桃粉.jpg',
  '/Products/罗马帘.jpg',
  '/Products/美丽奴.jpg',
  '/Products/翠微竹韵-金缎.jpg',
  '/Products/翠微竹韵-银雾.jpg',
  '/Products/茹伊丛林.jpg',
  '/Products/莫言亚光.jpg',
  '/Products/菱形纱.jpg',
  '/Products/蜂巢帘.jpg',
  '/Products/风沙流影.jpg',
  '/Products/香格里拉帘.jpg',
  '/Products/香榭丽.jpg'
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('Service Worker 安装中...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('缓存静态资源...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('静态资源缓存完成');
        return caches.open(IMAGE_CACHE);
      })
      .then((cache) => {
        console.log('缓存图片资源...');
        return cache.addAll(IMAGE_ASSETS);
      })
      .then(() => {
        console.log('图片资源缓存完成');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('缓存失败:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker 激活中...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== IMAGE_CACHE) {
              console.log('删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('旧缓存清理完成');
        return self.clients.claim();
      })
  );
});

// 拦截网络请求 - 缓存优先策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非GET请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过Chrome扩展等非HTTP请求
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 跳过Service Worker自身
  if (url.pathname === '/sw.js') {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          // 返回缓存的响应
          return response;
        }

        // 如果缓存中没有，则从网络获取
        return fetch(request)
          .then((networkResponse) => {
            // 检查响应是否有效
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // 克隆响应以便缓存
            const responseToCache = networkResponse.clone();

            // 根据资源类型选择缓存策略
            if (request.destination === 'image' || url.pathname.includes('/Products/')) {
              // 图片资源使用图片缓存
              caches.open(IMAGE_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            } else if (request.destination === 'audio' || url.pathname.includes('/Music/')) {
              // 音频资源使用动态缓存
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            } else if (request.destination === 'document' || request.destination === 'script' || request.destination === 'style') {
              // 文档、脚本、样式使用静态缓存
              caches.open(STATIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }

            return networkResponse;
          })
          .catch(() => {
            // 网络请求失败时的降级处理
            if (request.destination === 'image') {
              // 返回默认图片
              return caches.match('/Icons/default-image.png');
            } else if (request.destination === 'document') {
              // 返回离线页面
              return caches.match('/offline.html');
            }
            return new Response('网络请求失败', { status: 503 });
          });
      })
  );
});

// 后台同步 - 预加载重要资源
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      caches.open(IMAGE_CACHE)
        .then((cache) => {
          // 预加载一些重要的图片资源
          return cache.addAll(IMAGE_ASSETS.slice(0, 10));
        })
        .catch((error) => {
          console.error('后台同步失败:', error);
        })
    );
  }
});

// 推送通知处理
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'WHL窗帘有新消息',
    icon: '/Icons/icon-192x192.png',
    badge: '/Icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
        icon: '/Icons/explore-icon.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/Icons/close-icon.png'
      }
    ],
    requireInteraction: true,
    tag: 'whl-notification'
  };

  event.waitUntil(
    self.registration.showNotification('WHL窗帘', options)
  );
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/mobile.html')
    );
  } else if (event.action === 'close') {
    // 关闭通知，不做任何操作
  } else {
    // 默认点击行为 - 打开应用
    event.waitUntil(
      clients.openWindow('/mobile.html')
    );
  }
});

// 消息处理 - 用于与主线程通信
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// 错误处理
self.addEventListener('error', (event) => {
  console.error('Service Worker 错误:', event.error);
});

// 未处理的Promise拒绝
self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker 未处理的Promise拒绝:', event.reason);
});

// 定期清理过期缓存
setInterval(() => {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== IMAGE_CACHE) {
        caches.delete(cacheName);
      }
    });
  });
}, 24 * 60 * 60 * 1000); // 每24小时清理一次
>>>>>>> 269ffa1a1db39cf3bbf88877a426a6c574d06be6
