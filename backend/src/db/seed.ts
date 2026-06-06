import { db, sqlite } from './index';
import { users, sites, threads, comments } from './schema';
import crypto from 'crypto';

const hashPassword = async (password: string) => await Bun.password.hash(password);

async function seed() {
  console.log('Seeding database...');

  // Clear existing data
  await db.delete(comments);
  await db.delete(threads);
  await db.delete(sites);
  await db.delete(users);

  // Create Admin User
  const adminId = crypto.randomUUID();
  await db.insert(users).values({
    id: adminId,
    name: 'Admin',
    email: 'admin@blog.com',
    passwordHash: await hashPassword('password123'),
    role: 'admin',
  });

  // Create Site
  const siteId = crypto.randomUUID();
  const apiKey = crypto.randomBytes(24).toString('hex');
  await db.insert(sites).values({
    id: siteId,
    userId: adminId,
    domain: 'myblog.com',
    publicApiKey: apiKey,
  });

  // Create Threads
  const t1Id = crypto.randomUUID();
  const t2Id = crypto.randomUUID();
  const t3Id = crypto.randomUUID();
  
  await db.insert(threads).values([
    { id: t1Id, siteId, threadKey: 'article-1', title: 'Membangun Comment System Bertingkat di Laravel' },
    { id: t2Id, siteId, threadKey: 'article-2', title: 'Fitur Notifikasi di Blog: Apa Saja yang Perlu Dipertimbangkan' },
    { id: t3Id, siteId, threadKey: 'article-3', title: 'Tips Menulis Artikel yang SEO Friendly di 2024' },
  ]);

  // Create Comments matching the reference UI
  // 1. Barkah Fadhil (Root)
  const c1Id = crypto.randomUUID();
  await db.insert(comments).values({
    id: c1Id,
    threadId: t1Id,
    authorName: 'Barkah Fadhil',
    authorEmail: 'barkah@test.com',
    content: 'Artikel yang sangat bermanfaat! Penjelasannya jelas dan mudah dipahami, terutama bagian tentang implementasi sistem komentar bertingkat.',
    htmlContent: '<p>Artikel yang sangat bermanfaat! Penjelasannya jelas dan mudah dipahami, terutama bagian tentang implementasi sistem komentar bertingkat.</p>',
    status: 'approved',
    likesCount: 12,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  });

  // 1.1 Admin Blog (Reply to c1)
  const c2Id = crypto.randomUUID();
  await db.insert(comments).values({
    id: c2Id,
    threadId: t1Id,
    parentId: c1Id,
    authorName: 'Admin Blog',
    authorEmail: 'admin@blog.com',
    content: 'Terima kasih banyak atas apresiasinya! 🙏\nSenang sekali artikel ini bisa membantu.',
    htmlContent: '<p>Terima kasih banyak atas apresiasinya! 🙏<br>Senang sekali artikel ini bisa membantu.</p>',
    status: 'approved',
    likesCount: 5,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
  });

  // 1.1.1 Raka (Reply to c2)
  const c3Id = crypto.randomUUID();
  await db.insert(comments).values({
    id: c3Id,
    threadId: t1Id,
    parentId: c2Id,
    authorName: 'Raka',
    authorEmail: 'raka@test.com',
    content: 'Setuju! Struktur komentar bertingkat seperti ini bikin diskusi lebih terarah dan nyaman dibaca.',
    htmlContent: '<p>Setuju! Struktur komentar bertingkat seperti ini bikin diskusi lebih terarah dan nyaman dibaca.</p>',
    status: 'approved',
    likesCount: 3,
    createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
  });

  // 2. Nabila Zahra (Root, Pending)
  const c4Id = crypto.randomUUID();
  await db.insert(comments).values({
    id: c4Id,
    threadId: t2Id,
    authorName: 'Nabila Zahra',
    authorEmail: 'nabila@test.com',
    content: 'Apakah ada rencana untuk menambahkan notifikasi balasan komentar melalui email?',
    htmlContent: '<p>Apakah ada rencana untuk menambahkan notifikasi balasan komentar melalui email?</p>',
    status: 'pending',
    likesCount: 2,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
  });

  // Let's add some more random comments to pad out the stats
  for (let i = 0; i < 5; i++) {
    await db.insert(comments).values({
      id: crypto.randomUUID(),
      threadId: t3Id,
      authorName: `User ${i}`,
      authorEmail: `user${i}@test.com`,
      content: `Ini komentar test ke ${i}`,
      htmlContent: `<p>Ini komentar test ke ${i}</p>`,
      status: i % 2 === 0 ? 'approved' : 'spam',
      likesCount: i,
    });
  }

  console.log('Seeding complete!');
  console.log('Use this API key for the widget:', apiKey);
  sqlite.close();
}

seed().catch(console.error);
