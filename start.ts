import dotenv from 'dotenv';
dotenv.config();
const queuePage = 10;
const queueTime = 300000;
import originalFetch from 'fetch-retry';
const fetch = originalFetch(global.fetch, {
  retries: 50,
  retryDelay: 1000,
  retryOn: [429],
});
import {
  Pool
} from 'pg';
const userPool = new Pool({
  connectionString: process.env.POOL,
});
userPool.on('error', (err) => {
  console.error('Error (Database): ', err);
});

let queueArray = [
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ]
  ] as any,
  oldQueuers = [
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ]
  ] as any,
  regions = [{
      small: "us-e"
    },
    {
      small: "eu"
    },
    {
      small: "sea"
    },
    {
      small: "brz"
    },
    {
      small: "aus"
    },
    {
      small: "us-w"
    },
    {
      small: "jpn"
    },
    {
      small: "sa"
    },
    {
      small: "me"
    }
  ];

async function queueBase(newQueue: any, oldQueue: any, last: number) {
  const query = `
    UPDATE queue
    SET current = $1,
        old = $2,
        last = $4
    WHERE id = $3`;
  const values = [JSON.stringify(newQueue), JSON.stringify(oldQueue), 1, last];
  try {
    const client = await userPool.connect();
    await client.query(query, values);
    client.release();
    return "success";
  } catch (err) {
    console.error(err);
    console.log(`Postgres Queue\n\n${err}`)
    return err
  };
};
async function discord() {
  await fetch(process.env.WEBHOOK as string, {
    method: "POST",
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify({
      username: "QUEUE HOOK",
      content: "updated"
    })
  })
}
async function getSavedQueue() {
  const query = `
    SELECT *
    FROM queue
    WHERE id = $1`;
  try {
    const client = await userPool.connect();
    const res = await client.query(query, [1]);
    client.release();
    queueArray = JSON.parse(res.rows[0].current);
    oldQueuers = JSON.parse(res.rows[0].old);
    console.log("done getting old queue")
  } catch (err) {
    console.error(err);
    return err
  };
};
async function cleanArray() {
  queueArray = [
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ]
  ];
  oldQueuers = [
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ]
  ];
};
async function getQueues() {
  console.time('q');
  let array = [] as any;
  const date = new Date();
  console.log('starting queue update');
  const promises1 = regions.map(async (acc, r) => {
    if (!array[r]) array[r] = [];
    for (var t = 0; t < 3; t++) {
      if (!array[r][t]) array[r][t] = [];
      for (var p = 0; p < queuePage; p++) {
        let url = await fetch(`https://api.brawlhalla.com/rankings/${t !== 2 ? `${t+1}v${t+1}` : "rotating"}/${acc.small}/${p+1}?api_key=${process.env.API_KEY}`).then(r => r.json());
        try {
          console.log(`https://api.brawlhalla.com/rankings/${t !== 2 ? `${t+1}v${t+1}` : "rotating"}/${acc.small}/${p+1}?api_key=${process.env.API_KEY}`);
          for (var u = 0; u < url.length; u++) {
            const id = t !== 1 ? url[u].brawlhalla_id : url[u].brawlhalla_id_one + url[u].brawlhalla_id_two;
            const oldUser = queueArray[r][t].filter((old: {
              id: any;
            }) => old.id === id)[0];
            array[r][t].push({
              id: id,
              name: t !== 1 ? url[u].name : url[u].teamname,
              rank: {
                tier: url[u].tier,
                old: oldUser !== undefined ? oldUser.rank : url[u].rank,
                current: url[u].rank
              },
              rating: {
                old: oldUser !== undefined ? oldUser.rating : url[u].rating,
                current: url[u].rating,
                peak: url[u].peak_rating
              },
              games: url[u].games,
              wins: url[u].wins,
              since: date.getTime(),
              time: date.getTime()
            })
          };
        } catch (err) {
          console.log(err)
          return err
        }
      };
    };
  });
  await Promise.all(promises1);
  console.log('sorting queues')
  for (var i = 0; i < array.length; i++) {
    for (var o = 0; o < array[i].length; o++) {
      for (var p = 0; p < array[i][o].length; p++) {
        const userData = queueArray[i][o].filter((u: {
          id: any;
        }) => u.id === array[i][o][p].id)[0];
        if (userData !== undefined) {
          if (array[i][o][p].games !== userData.games) {
            queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].name = array[i][o][p].name;
            queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].games = array[i][o][p].games;
            queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].wins = array[i][o][p].wins;
            queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].rank.tier = array[i][o][p].rank.tier;
            queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].rank.old = queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].rank.current;
            queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].rank.current = array[i][o][p].rank.current;
            queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].rating.old = queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].rating.current;
            queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].rating.current = array[i][o][p].rating.current;
            queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].rating.peak = array[i][o][p].rating.peak;
            queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].time = array[i][o][p].time;
          }
        } else if (oldQueuers[i][o].filter((u: {
            id: any;
          }) => u.id === array[i][o][p].id)[0] !== undefined) {
          if (array[i][o][p].games !== oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].games) {
            queueArray[i][o].push(array[i][o][p]);
            queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].name = array[i][o][p].name;
            queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].rank.old = oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].rank.current;
            queueArray[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].rating.old = oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === array[i][o][p].id)[0].rating.current;
          }
        } else if (userData === undefined && oldQueuers[i][o].filter((u: {
            id: any;
          }) => u.id === array[i][o][p].id)[0] === undefined) {
          queueArray[i][o].push(array[i][o][p]);
        }
      };
      let newarr = [];
      queueArray[i][o] = queueArray[i][o].sort(function (a: {
        rank: {
          current: number;
        };
      }, b: {
        rank: {
          current: number;
        };
      }) {
        return a.rank.current - b.rank.current
      });
      for (var k = 0; k < queueArray[i][o].length; k++) {
        if ((date.getTime() - queueArray[i][o][k].time) <= 720000) {
          newarr.push(queueArray[i][o][k]);
        } else {
          if (oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === queueArray[i][o][k].id)[0] !== undefined) {
            //oldQueuers[i][o].filter(u => u.id === queueArray[i][o][k].id)[0] = queueArray[i][o][k];
            oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === queueArray[i][o][k].id)[0].name = queueArray[i][o][k].name;
            oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === queueArray[i][o][k].id)[0].games = queueArray[i][o][k].games;
            oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === queueArray[i][o][k].id)[0].wins = queueArray[i][o][k].wins;
            oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === queueArray[i][o][k].id)[0].rank.tier = queueArray[i][o][k].rank.tier;
            oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === queueArray[i][o][k].id)[0].rank.old = queueArray[i][o][k].rank.old;
            oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === queueArray[i][o][k].id)[0].rank.current = queueArray[i][o][k].rank.current;
            oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === queueArray[i][o][k].id)[0].rating.old = queueArray[i][o][k].rating.old;
            oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === queueArray[i][o][k].id)[0].rating.current = queueArray[i][o][k].rating.current;
            oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === queueArray[i][o][k].id)[0].rating.peak = queueArray[i][o][k].rating.peak;
            oldQueuers[i][o].filter((u: {
              id: any;
            }) => u.id === queueArray[i][o][k].id)[0].time = queueArray[i][o][k].time;
          } else {
            oldQueuers[i][o].push(queueArray[i][o][k]);
          };
        };
      };
      queueArray[i][o] = newarr;
    };
  };
  await queueBase(queueArray, oldQueuers, date.getTime() + 360000)
  console.log("done queue update");
  console.timeEnd('q');
};

async function everything(clean: boolean) {
  console.log(`\npages: ${queuePage}\nupdates every ${(queueTime/1000) / 60} minutes\nrequests every 15 minutes: ${(regions.length * 3 * queuePage) * (15 / ((queueTime/1000) / 60))}\n`);
  if (clean == true) await cleanArray();
  await getSavedQueue();
  await getQueues();
  await discord();
};
(async () => {
  await everything(false)
})();

setInterval(async function () {
  await everything(true)
}, queueTime);