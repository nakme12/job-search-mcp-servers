/**
 * Stealth Screen-Tracker 15-second Pre-Warning Daemon
 * Plays a discrete beep / powershell notification 15s before every :48s mark.
 * Also prints NestJS route explorer stealth logs.
 */

const { exec } = require('child_process');

function getNextTargetMs() {
  const now = new Date();
  const currentSec = now.getSeconds();
  const currentMs = now.getMilliseconds();
  
  // Tracker hits at :48s every 5 mins (e.g. 12:03:48, 12:08:48, 12:13:48...)
  // We want warning 15s BEFORE :48s -> which is :33s of every 5-min block.
  const currentMinute = now.getMinutes();
  const remainder = currentMinute % 5; // 0, 1, 2, 3, 4
  
  // Next 5-min target minute (where remainder is 3 for 12:03, 12:08, 12:13...)
  // The user told us: 11:53:48 -> next is 11:58:48 -> 12:03:48 -> 12:08:48...
  // Minutes end in 3 or 8!
  // So warning should trigger at minute ending in 3 or 8 at :33s!
  
  let targetMin = currentMinute;
  while ((targetMin % 5) !== 3) {
    targetMin++;
  }
  
  let targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), targetMin, 33, 0);
  if (targetDate <= now) {
    targetDate = new Date(targetDate.getTime() + 5 * 60 * 1000);
  }
  return targetDate.getTime() - now.getTime();
}

console.log("[Nest] 20604  - " + new Date().toLocaleString() + "     LOG [RouterExplorer] Stealth Pre-Warning Service Initialized.");

function scheduleNext() {
  const ms = getNextTargetMs();
  console.log(`[Nest] 20604  - Next 15s-Warning in ${(ms / 1000).toFixed(1)}s (at :33s mark).`);
  
  setTimeout(() => {
    // 15 seconds warning before screenshot
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n======================================================`);
    console.log(`🚨 [STEALTH ALERT] 15 SECONDS REMAINING BEFORE SCREENSHOT (${timestamp})`);
    console.log(`👉 SWITCH TO DESKTOP 1 / MINIMIZE TERMINAL NOW!`);
    console.log(`======================================================\n`);
    
    // Windows discrete beep via PowerShell
    exec('powershell -Command "[console]::beep(800, 300)"', () => {});

    // After 15 seconds, print full-screen NestJS server logs
    setTimeout(() => {
      const nowStr = new Date().toLocaleDateString() + ", " + new Date().toLocaleTimeString();
      const logs = [
        `[Nest] 20604  - ${nowStr}     LOG [NestFactory] Starting Nest application...`,
        `[Nest] 20604  - ${nowStr}     LOG [InstanceLoader] AppModule dependencies initialized +12ms`,
        `[Nest] 20604  - ${nowStr}     LOG [InstanceLoader] ConfigModule dependencies initialized +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [InstanceLoader] TypeOrmModule dependencies initialized +2ms`,
        `[Nest] 20604  - ${nowStr}     LOG [InstanceLoader] AuthModule dependencies initialized +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [InstanceLoader] MarketingModule dependencies initialized +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [InstanceLoader] UsersModule dependencies initialized +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RoutesResolver] AuthController {/api/v1/auth}: +8ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/auth/login, POST} route +2ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/auth/register, POST} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/auth/refresh, POST} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RoutesResolver] UsersController {/api/v1/users}: +3ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/users/profile, GET} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/users/profile, PATCH} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RoutesResolver] MarketingCampaignController {/api/v1/admin/marketing}: +5ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/campaigns, POST} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/campaigns/:id, PATCH} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/campaigns/:id, DELETE} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/campaigns/:id/duplicate, POST} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/campaigns/:id/test, POST} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/campaigns/:id/send, POST} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/campaigns/:id/cancel, POST} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/campaigns/:id/recipients, GET} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/email-keys, GET} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/email-keys/:key, GET} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/email-keys/:key/organizations, GET} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/email-keys/:key/mark-sent, POST} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/senders, GET} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/senders, POST} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RouterExplorer] Mapped {/api/v1/admin/marketing/senders/:id, PATCH} route +1ms`,
        `[Nest] 20604  - ${nowStr}     LOG [NestApplication] Nest application successfully started +428ms`,
        `[Nest] 20604  - ${nowStr}     LOG [TypeOrmModule] Database connection established (PostgreSQL @ localhost:5432) +15ms`,
        `[Nest] 20604  - ${nowStr}     LOG [RedisService] Redis cache cluster connected successfully +5ms`,
        `[Nest] 20604  - ${nowStr}     LOG [NestApplication] Server listening on http://localhost:3000 (development mode) +2ms`
      ];
      console.log(logs.join('\n'));
      
      // Schedule next 5-min cycle
      scheduleNext();
    }, 15000);

  }, ms);
}

scheduleNext();
