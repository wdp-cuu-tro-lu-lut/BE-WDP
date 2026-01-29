const { execSync } = require('child_process');

// Lấy tham số tên migration từ dòng lệnh (nếu có)
// Lưu ý: với npm run, cần dùng dấu -- để truyền tham số. Ví dụ: npm run migration:generate -- AddNewTable
const args = process.argv.slice(2);
let name = args[0];

if (!name) {
    // Nếu không có tên, đặt tên mặc định kèm timestamp ngắn gọn hoặc tên chung
    // TypeORM tự động thêm timestamp vào tên file, nên ta chỉ cần tên định danh
    name = 'AutoUpdate'; 
    console.log('⚠️  Không có tên migration được cung cấp. Sử dụng tên mặc định: "AutoUpdate"');
    console.log('💡 Mẹo: Để đặt tên cụ thể, dùng lệnh: npm run migration:generate -- TenMigrationCuaBan');
}

const migrationPath = `src/migrations/${name}`;
console.log(`🚀 Đang tạo migration tại: ${migrationPath}...`);

// Lệnh thực thi: sử dụng ts-node để chạy TypeORM CLI với source TypeScript
// -r tsconfig-paths/register: để load các path alias (như @/...)
const command = `npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate -d src/data-source.ts ${migrationPath}`;

try {
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Tạo migration thành công!');
} catch (error) {
    console.error('❌ Tạo migration thất bại.');
    process.exit(1);
}
