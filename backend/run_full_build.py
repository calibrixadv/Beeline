import asyncio, time
from backend.scraper.pipeline import TransitScraperPipeline

async def main():
    t0 = time.monotonic()
    p = TransitScraperPipeline(offline=True)
    try:
        samples = await p.generate_multiyear_dataset(
            start_date="2023-01-01",
            end_date="2026-11-01",
            sample_step=3,
            tier="TIER_3_NATIONAL",
            output_path="backend/scraper/.cache/dataset_real_2023_2026.parquet",
        )
        print(f"[+] GATA! {len(samples)} randuri generate in {(time.monotonic()-t0)/60:.1f} minute!")
    finally:
        await p.close()

asyncio.run(main())
