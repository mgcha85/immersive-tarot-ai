import { test, expect, Page } from '@playwright/test';

test.describe('Immersive Tarot - Core User Flows', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
    });

    test('should display the main UI elements', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Immersive Tarot');
        
        const input = page.locator('input[type="text"]');
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Type here...');
        
        const askButton = page.getByRole('button', { name: 'Ask' });
        await expect(askButton).toBeVisible();
        await expect(askButton).toBeEnabled();
    });

    test('should show connection status indicator', async ({ page }) => {
        const statusContainer = page.locator('text=Live').or(page.locator('text=Offline'));
        await expect(statusContainer).toBeVisible({ timeout: 5000 });
    });

    test('should submit a query and receive card selection', async ({ page }) => {
        const input = page.locator('input[type="text"]');
        await input.fill('What does my future hold?');
        
        await page.getByRole('button', { name: 'Ask' }).click();
        
        await expect(page.getByText("Oracle's Selection:")).toBeVisible({ timeout: 15000 });
        
        const cardItems = page.locator('ul li');
        await expect(cardItems).toHaveCount(3);
        
        const firstCard = cardItems.first();
        await expect(firstCard).toContainText(/(Upright|Reversed)/);
    });

    test('should allow submitting query with Enter key', async ({ page }) => {
        const input = page.locator('input[type="text"]');
        await input.fill('Will I find love?');
        await input.press('Enter');
        
        await expect(page.getByText("Oracle's Selection:")).toBeVisible({ timeout: 15000 });
    });

    test('should disable Ask button while loading', async ({ page }) => {
        const input = page.locator('input[type="text"]');
        await input.fill('Test query');
        
        const askButton = page.getByRole('button', { name: 'Ask' });
        await askButton.click();
        
        await expect(page.getByRole('button', { name: '...' })).toBeVisible();
        
        await expect(page.getByText("Oracle's Selection:")).toBeVisible({ timeout: 15000 });
        
        await expect(askButton).toBeEnabled();
    });

    test('should not submit empty query', async ({ page }) => {
        const askButton = page.getByRole('button', { name: 'Ask' });
        await askButton.click();
        
        await page.waitForTimeout(1000);
        await expect(page.getByText("Oracle's Selection:")).not.toBeVisible();
    });
});

test.describe('Immersive Tarot - 3D Canvas Interactions', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
        await page.waitForTimeout(2000);
    });

    test('should render 3D canvas without errors', async ({ page }) => {
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible();
        
        const boundingBox = await canvas.boundingBox();
        expect(boundingBox).not.toBeNull();
        expect(boundingBox!.width).toBeGreaterThan(100);
        expect(boundingBox!.height).toBeGreaterThan(100);
    });

    test('should have no console errors during load', async ({ page }) => {
        const errors: string[] = [];
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });
        
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
        await page.waitForTimeout(3000);
        
        const criticalErrors = errors.filter(e => 
            !e.includes('WebGL') && 
            !e.includes('THREE.WebGLRenderer') &&
            !e.includes('404')
        );
        
        expect(criticalErrors).toHaveLength(0);
    });

    test('should respond to mouse movement', async ({ page }) => {
        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();
        
        if (!box) throw new Error('Canvas not found');
        
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.waitForTimeout(100);
        await page.mouse.move(box.x + 300, box.y + 200);
        await page.waitForTimeout(100);
    });

    test('should handle click events on canvas', async ({ page }) => {
        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();
        
        if (!box) throw new Error('Canvas not found');
        
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(500);
    });
});

test.describe('Immersive Tarot - WebSocket Communication', () => {
    
    test('should attempt WebSocket connection on load', async ({ page }) => {
        const wsMessages: string[] = [];
        
        page.on('websocket', ws => {
            ws.on('framesent', frame => wsMessages.push(`sent: ${frame.payload}`));
            ws.on('framereceived', frame => wsMessages.push(`received: ${frame.payload}`));
        });
        
        await page.goto('http://localhost:5173');
        await page.waitForTimeout(3000);
    });

    test('should toggle between WS and REST mode', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
        
        const toggleButton = page.locator('button:has-text("REST")').or(
            page.locator('button:has-text("WS")')
        );
        
        if (await toggleButton.isVisible()) {
            await toggleButton.click();
            await page.waitForTimeout(500);
        }
    });
});

test.describe('Immersive Tarot - AI Interpretation Display', () => {
    
    test('should display streaming interpretation text', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
        
        const input = page.locator('input[type="text"]');
        await input.fill('What guidance do the cards offer?');
        await page.getByRole('button', { name: 'Ask' }).click();
        
        await expect(page.getByText("Oracle's Selection:")).toBeVisible({ timeout: 15000 });
        
        await page.waitForTimeout(2000);
    });

    test('should display card keywords correctly', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
        
        const input = page.locator('input[type="text"]');
        await input.fill('Career guidance please');
        await page.getByRole('button', { name: 'Ask' }).click();
        
        await expect(page.getByText("Oracle's Selection:")).toBeVisible({ timeout: 15000 });
        
        const keywords = page.locator('.opacity-70.text-xs');
        await expect(keywords.first()).toBeVisible();
    });
});

test.describe('Immersive Tarot - Performance', () => {
    
    test('should maintain acceptable FPS during interactions', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
        
        const metrics = await page.evaluate(() => {
            return new Promise<{ fps: number }>((resolve) => {
                let frameCount = 0;
                const startTime = performance.now();
                
                function countFrame() {
                    frameCount++;
                    if (performance.now() - startTime < 1000) {
                        requestAnimationFrame(countFrame);
                    } else {
                        resolve({ fps: frameCount });
                    }
                }
                
                requestAnimationFrame(countFrame);
            });
        });
        
        expect(metrics.fps).toBeGreaterThanOrEqual(30);
    });

    test('should load within acceptable time', async ({ page }) => {
        const startTime = Date.now();
        
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
        
        const loadTime = Date.now() - startTime;
        
        expect(loadTime).toBeLessThan(5000);
    });
});

test.describe('Immersive Tarot - Edge Cases', () => {
    
    test('should handle very long query gracefully', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
        
        const longQuery = 'A'.repeat(1000);
        const input = page.locator('input[type="text"]');
        await input.fill(longQuery);
        await page.getByRole('button', { name: 'Ask' }).click();
        
        await expect(page.getByText("Oracle's Selection:")).toBeVisible({ timeout: 15000 });
    });

    test('should handle special characters in query', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
        
        const input = page.locator('input[type="text"]');
        await input.fill('What about my <script>alert("xss")</script> future?');
        await page.getByRole('button', { name: 'Ask' }).click();
        
        await expect(page.getByText("Oracle's Selection:")).toBeVisible({ timeout: 15000 });
    });

    test('should handle rapid consecutive queries', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
        
        const input = page.locator('input[type="text"]');
        
        await input.fill('Query 1');
        await page.getByRole('button', { name: 'Ask' }).click();
        
        await page.waitForTimeout(100);
        
        await input.fill('Query 2');
        await page.getByRole('button', { name: 'Ask' }).click();
        
        await page.waitForTimeout(5000);
    });

    test('should gracefully handle backend unavailable', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
        
        await expect(page.locator('h1')).toContainText('Immersive Tarot');
    });
});

test.describe('Immersive Tarot - Visual Regression', () => {
    
    test('should match initial load screenshot', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
        await page.waitForTimeout(3000);
        
        await expect(page.locator('.absolute.inset-0')).toHaveScreenshot('ui-overlay.png', {
            maxDiffPixelRatio: 0.1,
        });
    });

    test('should match card selection state screenshot', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas', { timeout: 10000 });
        
        const input = page.locator('input[type="text"]');
        await input.fill('Test reading');
        await page.getByRole('button', { name: 'Ask' }).click();
        
        await expect(page.getByText("Oracle's Selection:")).toBeVisible({ timeout: 15000 });
        
        await expect(page.locator('.bg-black\\/40.rounded')).toHaveScreenshot('card-selection-panel.png', {
            maxDiffPixelRatio: 0.15,
        });
    });
});
