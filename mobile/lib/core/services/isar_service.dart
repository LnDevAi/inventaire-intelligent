import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';
import '../../data/models/pending_scan_model.dart';

class IsarService {
  static final IsarService instance = IsarService._();
  IsarService._();

  late Isar _isar;
  Isar get db => _isar;

  Future<void> open() async {
    final dir = await getApplicationDocumentsDirectory();
    _isar = await Isar.open(
      [PendingScanModelSchema],
      directory: dir.path,
      name: 'inventaire_offline',
    );
  }
}
