import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { Account, Category } from '@/database/entities';
import { ItemCondition } from '@/database/entities/warehouse-stock.entity';
import { WarehouseService } from '@/warehouse/services';
import { DataSource } from 'typeorm';

async function seedManualStockEntry() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const dataSource = app.get(DataSource);
    const warehouseService = app.get(WarehouseService);

    const accountRepository = dataSource.getRepository(Account);
    const categoryRepository = dataSource.getRepository(Category);

    const admin = await accountRepository.findOne({
      where: { email: 'admin@example.com' },
    });

    if (!admin) {
      throw new Error('Admin account admin@example.com not found. Run the main seed first.');
    }

    const preferredCategories = ['Nước uống', 'Thực phẩm khô', 'Thuốc men'];
    const categories = await categoryRepository.find({
      where: preferredCategories.map((name) => ({ name })),
      take: 3,
    });

    const selectedCategories =
      categories.length >= 2
        ? categories
        : await categoryRepository.find({
            order: { createdAt: 'ASC' },
            take: 2,
          });

    if (selectedCategories.length === 0) {
      throw new Error('No categories found. Seed categories before running this script.');
    }

    const timestamp = Date.now();
    const manualReceipt = await warehouseService.createManualStockEntry(admin.id, {
      referenceCode: `MANUAL-SEED-${timestamp}`,
      note: 'Seed script: nhập tay mẫu cho kho',
      items: selectedCategories.map((category, index) => ({
        categoryId: category.id,
        condition: index === 0 ? ItemCondition.GOOD : ItemCondition.EXCELLENT,
        quantity: index === 0 ? 24 : 12,
      })),
    });

    console.log('Manual warehouse stock entry created successfully:');
    console.log(
      JSON.stringify(
        {
          receiptId: manualReceipt.id,
          receiptType: manualReceipt.receiptType,
          referenceCode: manualReceipt.referenceCode,
          note: manualReceipt.note,
          itemCount: manualReceipt.items?.length ?? 0,
          items: (manualReceipt.items ?? []).map((item: any) => ({
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            condition: item.condition,
            quantity: item.quantity,
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

seedManualStockEntry().catch((error) => {
  console.error(error);
  process.exit(1);
});