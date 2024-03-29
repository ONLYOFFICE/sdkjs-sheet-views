/*
 * (c) Copyright Ascensio System SIA 2010-2019
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-12 Ernesta Birznieka-Upisha
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */


(function (window, document) {
	window['Asc']['Addons'] = window['Asc']['Addons'] || {};
	window['Asc']['Addons']['sheet-views'] = true; // register addon

	var asc = window["Asc"];
	var prot;
	var spreadsheet_api = asc["spreadsheet_api"];
	prot = spreadsheet_api.prototype;

	var c_oAscLockTypeElem = AscCommonExcel.c_oAscLockTypeElem;
	var c_oAscError = asc.c_oAscError;

	//TODO временно положил в прототип. перенести!
	spreadsheet_api.prototype.sheetViewManagerLocks = [];

	spreadsheet_api.prototype.asc_addNamedSheetView = function (duplicateNamedSheetView, setActive) {
		var t = this;
		var ws = this.wb && this.wb.getWorksheet();
		var wsModel = ws ? ws.model : null;
		if (!wsModel) {
			return;
		}

		if (this.isNamedSheetViewManagerLocked(wsModel.Id)) {
			t.handlers.trigger("asc_onError", c_oAscError.ID.LockedEditView, c_oAscError.Level.NoCritical);
			return;
		}

		var namedSheetView;
		if (duplicateNamedSheetView) {
			namedSheetView = duplicateNamedSheetView.clone();
		} else {
			//если создаём новый вью когда находимся на другом вью, клонируем аквтиный
			var activeNamedSheetViewId = wsModel.getActiveNamedSheetViewId();
			if (activeNamedSheetViewId !== null) {
				duplicateNamedSheetView = true;
				namedSheetView = wsModel.getNamedSheetViewById(activeNamedSheetViewId).clone();
				namedSheetView.name = null;
			} else {
				namedSheetView = new Asc.CT_NamedSheetView();
			}
		}
		namedSheetView.ws = wsModel;
		namedSheetView.name = namedSheetView.generateName();

		this._isLockedNamedSheetView([namedSheetView], function(success) {
			if (!success) {
				t.handlers.trigger("asc_onError", c_oAscError.ID.LockedEditView, c_oAscError.Level.NoCritical);
				return;
			}

			AscCommon.History.Create_NewPoint();
			AscCommon.History.StartTransaction();
			wsModel.addNamedSheetView(namedSheetView, !!duplicateNamedSheetView);

			if (setActive) {
				t.asc_setActiveNamedSheetView(namedSheetView.name);
			}

			AscCommon.History.EndTransaction();

			if (!setActive) {
				t.handlers.trigger("asc_onRefreshNamedSheetViewList", wsModel.index);
			}
		});
	};

	spreadsheet_api.prototype.asc_getNamedSheetViews = function () {
		var ws = this.wb && this.wb.getWorksheet();
		var wsModel = ws ? ws.model : null;
		if (!wsModel) {
			return null;
		}

		return wsModel.getNamedSheetViews();
	};

	spreadsheet_api.prototype.asc_getActiveNamedSheetView = function (index) {
		var ws = this.wbModel.getWorksheet(index);
		if (!ws) {
			return null;
		}

		var activeNamedSheetViewId = ws.getActiveNamedSheetViewId();
		if (activeNamedSheetViewId !== null) {
			var activeNamedSheetView = ws.getNamedSheetViewById(activeNamedSheetViewId);
			if (activeNamedSheetView) {
				return activeNamedSheetView.name;
			}
		}

		return null;
	};

	spreadsheet_api.prototype.asc_deleteNamedSheetViews = function (namedSheetViews) {
		var t = this;
		var ws = this.wb && this.wb.getWorksheet();
		var wsModel = ws ? ws.model : null;
		if (!wsModel) {
			return;
		}

		this._isLockedNamedSheetView(namedSheetViews, function(success) {
			if (!success) {
				t.handlers.trigger("asc_onError", c_oAscError.ID.LockedEditView, c_oAscError.Level.NoCritical);
				return;
			}

			AscCommon.History.Create_NewPoint();
			AscCommon.History.StartTransaction();
			wsModel.deleteNamedSheetViews(namedSheetViews);
			AscCommon.History.EndTransaction();

			t.handlers.trigger("asc_onRefreshNamedSheetViewList", wsModel.index);
		});
	};

	spreadsheet_api.prototype._isLockedNamedSheetView = function (namedSheetViews, callback) {
		if (!namedSheetViews || !namedSheetViews.length) {
			callback(false);
		}
		var lockInfoArr =  [];
		for (var i = 0; i < namedSheetViews.length; i++) {
			var namedSheetView = namedSheetViews[i];
			var lockInfo = this.collaborativeEditing.getLockInfo(c_oAscLockTypeElem.Object, null,
				this.asc_getActiveWorksheetId(), namedSheetView.Get_Id());
			lockInfoArr.push(lockInfo);
		}
		this.collaborativeEditing.lock(lockInfoArr, callback);
	}

	spreadsheet_api.prototype._onUpdateNamedSheetViewLock = function(lockElem) {
		var t = this;

		if (c_oAscLockTypeElem.Object === lockElem.Element["type"]) {
			var wsModel = t.wbModel.getWorksheetById(lockElem.Element["sheetId"]);
			if (wsModel) {
				var wsIndex = wsModel.getIndex();
				var sheetView = wsModel.getNamedSheetViewById(lockElem.Element["rangeOrObjectId"]);
				if (sheetView) {
					sheetView.isLock = lockElem.UserId;
					this.handlers.trigger("asc_onRefreshNamedSheetViewList", wsIndex);
				}

				this.sheetViewManagerLocks[wsModel.Id] = true;
			}
		}
	};

	spreadsheet_api.prototype._onUpdateAllSheetViewLock = function () {
		var t = this;
		if (t.wbModel) {
			var i, length, wsModel, wsIndex;
			for (i = 0, length = t.wbModel.getWorksheetCount(); i < length; ++i) {
				wsModel = t.wbModel.getWorksheet(i);
				wsIndex = wsModel.getIndex();

				if (wsModel.aNamedSheetViews) {
					for (var j = 0; j < wsModel.aNamedSheetViews.length; j++) {
						var sheetView = wsModel.aNamedSheetViews[j];
						sheetView.isLock = null;
					}
				}
				this.handlers.trigger("asc_onRefreshNamedSheetViewList", wsIndex);
				this.sheetViewManagerLocks[wsModel.Id] = false;
			}
		}
	};

	spreadsheet_api.prototype.isNamedSheetViewManagerLocked = function (id) {
		return this.sheetViewManagerLocks[id];
	};

	spreadsheet_api.prototype.asc_setActiveNamedSheetView = function(name, index) {
		if (index === undefined) {
			index = this.wbModel.getActive();
		}
		var ws = this.wbModel.getWorksheet(index);
		
		//при переходе между вью - hidden manager не обновляется.
		var changedHiddenRowsArr = [];
		var historyUpdateRange = new asc.Range(0, 0, 0, 0);
		var i;

		ws.autoFilters.forEachTables(function (table) {
			historyUpdateRange.union2(table.Ref);
			for (var i = table.Ref.r1; i < table.Ref.r2; i++) {
				ws._getRowNoEmpty(i, function(row){
					if (row) {
						changedHiddenRowsArr[row.index] = row.getHidden();
					}
				});
			}
		});
		if (ws.AutoFilter && ws.AutoFilter.Ref) {
			for (i = ws.AutoFilter.Ref.r1; i < ws.AutoFilter.Ref.r2; i++) {
				ws._getRowNoEmpty(i, function(row){
					if (row) {
						changedHiddenRowsArr[row.index] = row.getHidden();
					}
				});
			}
		}

		var oldActiveId = ws.getActiveNamedSheetViewId();
		ws.setActiveNamedSheetView(null);
		for (i = 0; i < ws.aNamedSheetViews.length; i++) {
			if (name === ws.aNamedSheetViews[i].name) {
				ws.setActiveNamedSheetView(ws.aNamedSheetViews[i].Id);
				ws.aNamedSheetViews[i]._isActive = true;
			} else {
				ws.aNamedSheetViews[i]._isActive = false;
			}
		}
		if (oldActiveId !== ws.getActiveNamedSheetViewId()) {
			AscCommon.History.Create_NewPoint();
			AscCommon.History.StartTransaction();

			if (ws.AutoFilter && ws.AutoFilter.Ref) {
				historyUpdateRange.union2(ws.AutoFilter.Ref);
			}

			AscCommon.History.Add(AscCommonExcel.g_oUndoRedoWorksheet, AscCH.historyitem_Worksheet_SetActiveNamedSheetView,
				ws ? ws.getId() : null, historyUpdateRange,
				new AscCommonExcel.UndoRedoData_FromTo(oldActiveId, ws.getActiveNamedSheetViewId()), true);

			AscCommon.History.EndTransaction();

			//TODO нужно переприменять в дальнейшем сортировку

			//если переходим на вью, то необходимо открыть все строки и применить фильтры
			//если переходим на дефолт, то необходимо скрыть ещё те строки, которые в модели лежат
			//посколько при переходе во вью данные из модели удалились - их нужно получить
			//т.е. нужно где-то хранить!

			//при переходе во вью - переносим с дефолта все флаги о скрытии строчек
			//переприменяем все фильтры
			//применяем скрытие строчек внутрии а/ф - используя новый флаг о скрытии
			//все остальные строчки - используя старый флаг о скрытии строк
			//получение данных о скрытой строке: в режиме вью внутри а/ф используем новый флаг
			//вне а/ф - старый флаг
			//при переходе из дефолта внутри а/ф(к которому не применен фильтр) наследуем флаг об скрытии/открытии ячеек
			//для этого прохожусь по всем строкам - и наследую флаг

			if (ws.getActiveNamedSheetViewId() !== null) {
				//чтобы не усложнять логику решил не наследовать внутри а/ф скрытые строки от дефолта
				//просто отрываем все строки, а далее применяем те, что скрыты во вью
				ws.getRange3(0, 0, AscCommon.gc_nMaxRow0, 0)._foreachRowNoEmpty(function(row) {
					if (ws.autoFilters.containInFilter(row.index/*, true*/)) {
						row.setHidden(false, true);
					} /*else {
						//наследуем с дефолта, если в этих строчках нет применнного фильтра
						row.setHidden(row.getHidden(false), true);
					}*/
				});
			}

			var _changeHiddenManager = function (_row) {
				if (_row && _row.index >= 0 && (!_row.getHidden() !== !changedHiddenRowsArr[_row.index])) {
					ws.hiddenManager.addHidden(true, _row.index);
				}
			};

			ws.autoFilters.forEachTables(function (table) {
				for (var i = table.Ref.r1; i < table.Ref.r2; i++) {
					ws._getRowNoEmpty(i, function(row){
						_changeHiddenManager(row);
					});
				}
			});
			if (ws.AutoFilter && ws.AutoFilter.Ref) {
				for (i = ws.AutoFilter.Ref.r1; i < ws.AutoFilter.Ref.r2; i++) {
					ws._getRowNoEmpty(i, function(row){
						_changeHiddenManager(row);
					});
				}
			}

			var oRange = new AscCommonExcel.Range(ws, historyUpdateRange.r1, historyUpdateRange.c1, historyUpdateRange.r2, historyUpdateRange.c2);
			this.wb.handleChartsOnWorkbookChange([oRange]);
			ws.autoFilters.reapplyAllFilters(true, ws.getActiveNamedSheetViewId() !== null, null, true);
			this.updateAllFilters();
			this.handlers.trigger("asc_onRefreshNamedSheetViewList", index);
		}
	};

	spreadsheet_api.prototype.updateAllFilters = function() {
		var t = this;
		var wsModel = this.wbModel.getWorksheet(this.wbModel.getActive());
		var ws = t.wb.getWorksheet(wsModel.getIndex());

		var arrChangedRanges = [];
		for (var i = 0; i < wsModel.TableParts.length; ++i) {
			var table = wsModel.TableParts[i];
			arrChangedRanges.push(table.Ref);
		}

		if (wsModel.AutoFilter) {
			arrChangedRanges.push(wsModel.AutoFilter.Ref);
		}

		ws._updateGroups();
		//wsModel.autoFilters.reDrawFilter(arn);
		var oRecalcType = AscCommonExcel.recalcType.full;
		//reinitRanges = true;
		//updateDrawingObjectsInfo = {target: c_oTargetType.RowResize, row: arn.r1};

		ws._initCellsArea(oRecalcType);
		if (oRecalcType) {
			ws.cache.reset();
		}
		ws._cleanCellsTextMetricsCache();
		ws.objectRender.bUpdateMetrics = false;
		ws._prepareCellTextMetricsCache();
		ws.objectRender.bUpdateMetrics = true;

		//arrChangedRanges = arrChangedRanges.concat(t.model.hiddenManager.getRecalcHidden());

		ws.cellCommentator.updateAreaComments();

		/*if (t.objectRender) {
			if (reinitRanges) {
				t._updateDrawingArea();
			}
			if (null !== updateDrawingObjectsInfo) {
				t.objectRender.updateSizeDrawingObjects(updateDrawingObjectsInfo);
			}
			if (null !== updateDrawingObjectsInfo2) {
				t.objectRender.updateDrawingObject(updateDrawingObjectsInfo2.bInsert,
					updateDrawingObjectsInfo2.operType, updateDrawingObjectsInfo2.updateRange);
			}
			t.model.onUpdateRanges(arrChangedRanges);
			t.objectRender.rebuildChartGraphicObjects(arrChangedRanges);
		}
		t.scrollType |= AscCommonExcel.c_oAscScrollType.ScrollVertical | AscCommonExcel.c_oAscScrollType.ScrollHorizontal;*/
		ws.draw();

		ws._updateVisibleRowsCount();

		ws.handlers.trigger("selectionChanged");
		ws.handlers.trigger("selectionMathInfoChanged", ws.getSelectionMathInfo());
	};

	spreadsheet_api.prototype.initGlobalObjectsNamedSheetView = function(wbModel) {
		AscCommonExcel.g_oUndoRedoNamedSheetViews = new AscCommonExcel.UndoRedoNamedSheetViews(wbModel);
	};

	prot["asc_addNamedSheetView"] = prot.asc_addNamedSheetView;
	prot["asc_getNamedSheetViews"] = prot.asc_getNamedSheetViews;
	prot["asc_deleteNamedSheetViews"] = prot.asc_deleteNamedSheetViews;
	prot["asc_setActiveNamedSheetView"] = prot.asc_setActiveNamedSheetView;
	prot["asc_getActiveNamedSheetView"] = prot.asc_getActiveNamedSheetView;

})(window, window.document);
