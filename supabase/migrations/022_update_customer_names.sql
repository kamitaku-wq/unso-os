-- 客先店舗の正式名称と本社住所を設定（PDF準拠）
-- 全店舗は株式会社グッドスピード（本社: 名古屋市東区泉）

UPDATE customers SET
  name = '株式会社グッドスピード春日井店',
  address = '〒461-0001 愛知県名古屋市東区泉2丁目28-23 高岳KANAMEビル8F'
WHERE cust_id = 'GS-KS';

UPDATE customers SET
  name = '株式会社グッドスピード知立店',
  address = '〒461-0001 愛知県名古屋市東区泉2丁目28-23 高岳KANAMEビル8F'
WHERE cust_id = 'GS-TI';

UPDATE customers SET
  name = '株式会社グッドスピード大垣店',
  address = '〒461-0001 愛知県名古屋市東区泉2丁目28-23 高岳KANAMEビル8F'
WHERE cust_id = 'GS-OG';

UPDATE customers SET
  name = '株式会社グッドスピード小牧店',
  address = '〒461-0001 愛知県名古屋市東区泉2丁目28-23 高岳KANAMEビル8F'
WHERE cust_id = 'GS-KM';

UPDATE customers SET
  name = '株式会社グッドスピード名東店',
  address = '〒461-0001 愛知県名古屋市東区泉2丁目28-23 高岳KANAMEビル8F'
WHERE cust_id = 'GS-MT';

UPDATE customers SET
  name = '株式会社グッドスピードVan店',
  address = '〒461-0001 愛知県名古屋市東区泉2丁目28-23 高岳KANAMEビル8F'
WHERE cust_id = 'GS-BN';
