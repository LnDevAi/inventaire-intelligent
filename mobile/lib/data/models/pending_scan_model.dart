import 'package:isar/isar.dart';

part 'pending_scan_model.g.dart';

@Collection()
class PendingScanModel {
  Id id = Isar.autoIncrement;

  late String hardwareId;
  late String tagType;
  late String assetName;
  late String category;
  late double purchasePrice;
  late String purchaseDate;
  late int depreciationYears;
  String? photoPath;
  double? latitude;
  double? longitude;
  bool synced = false;

  @Index()
  late DateTime createdAt;
}
