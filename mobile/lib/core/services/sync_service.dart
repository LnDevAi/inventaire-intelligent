import 'package:connectivity_plus/connectivity_plus.dart';
import 'api_service.dart';
import 'isar_service.dart';
import '../../data/models/pending_scan_model.dart';

class SyncService {
  static final SyncService instance = SyncService._();
  SyncService._();

  void startListening() {
    Connectivity().onConnectivityChanged.listen((results) {
      final hasNetwork = results.any((r) => r != ConnectivityResult.none);
      if (hasNetwork) _syncPending();
    });
  }

  Future<void> _syncPending() async {
    final db = IsarService.instance.db;
    final pending = await db.pendingScanModels.filter().syncedEqualTo(false).findAll();
    if (pending.isEmpty) return;

    for (final scan in pending) {
      try {
        final asset = await ApiService.instance.createAsset({
          'name': scan.assetName,
          'category': scan.category,
          'purchasePrice': scan.purchasePrice,
          'purchaseDate': scan.purchaseDate,
          'depreciationYears': scan.depreciationYears,
        });
        await ApiService.instance.createTag({
          'assetId': asset['id'],
          'tagType': scan.tagType,
          'hardwareId': scan.hardwareId,
        });
        if (scan.latitude != null && scan.longitude != null) {
          await ApiService.instance.createLocation(
            asset['id'] as String, scan.latitude!, scan.longitude!,
          );
        }
        await db.writeTxn(() async {
          scan.synced = true;
          await db.pendingScanModels.put(scan);
        });
      } catch (_) {
        // Retry on next connectivity event
      }
    }
  }

  Future<int> pendingCount() async {
    return IsarService.instance.db.pendingScanModels.filter().syncedEqualTo(false).count();
  }
}
