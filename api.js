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
	window['Asc']['Addons']['sheet_views'] = true; // register addon

	var asc = window["Asc"];
	var prot;
	asc["spreadsheet_api"] = spreadsheet_api;
	prot = spreadsheet_api.prototype;

	var c_oAscLockTypeElem = AscCommonExcel.c_oAscLockTypeElem;
	var UndoRedoData_FromTo = AscCommonExcel.UndoRedoData_FromTo;

	spreadsheet_api.prototype.asc_addNamedSheetView = function () {
		var t = this;
		var ws = this.wb && this.wb.getWorksheet();
		var wsModel = ws ? ws.model : null;
		if (!wsModel) {
			return;
		}

		var namedSheetView = new Asc.CT_NamedSheetView();
		namedSheetView.ws = wsModel;
		namedSheetView.generateName();

		this._isLockedNamedSheetView([namedSheetView], function(success) {
			if (!success) {
				return;
			}

			History.Create_NewPoint();
			History.StartTransaction();
			wsModel.addNamedSheetView(namedSheetView);
			History.EndTransaction();

			this.handlers.trigger("asc_onRefreshNamedSheetViewList", wsModel.index);
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

	spreadsheet_api.prototype.asc_deleteNamedSheetViews = function (namedSheetViews) {
		var t = this;
		var ws = this.wb && this.wb.getWorksheet();
		var wsModel = ws ? ws.model : null;
		if (!wsModel) {
			return;
		}

		this._isLockedNamedSheetView(namedSheetViews, function(success) {
			if (!success) {
				return;
			}

			History.Create_NewPoint();
			History.StartTransaction();
			wsModel.deleteNamedSheetViews(namedSheetViews);
			History.EndTransaction();

			this.handlers.trigger("asc_onRefreshNamedSheetViewList", wsModel.index);
		});
	};

	spreadsheet_api.prototype._isLockedNamedSheetView = function (namedSheetViews, callback) {
		if (!namedSheetViews || !namedSheetViews.length) {
			callback(false);
		}
		var loInfoArr =  [];
		for (var i = 0; i < namedSheetViews.length; i++) {
			var namedSheetView = namedSheetViews[i];
			var lockInfo = this.collaborativeEditing.getLockInfo(c_oAscLockTypeElem.Object, AscCommonExcel.c_oAscLockTypeElemSubType.NamedSheetView,
				this.asc_getActiveWorksheetId(), namedSheetView.asc_getName());
			loInfoArr.push(lockInfo);
		}
		this.collaborativeEditing.lock(loInfoArr, callback);
	}

	spreadsheet_api.prototype._onUpdateNamedSheetViewLock = function(lockElem) {
		var t = this;

		if (c_oAscLockTypeElem.Object === lockElem.Element["type"] && AscCommonExcel.c_oAscLockTypeElemSubType.NamedSheetView === lockElem.Element["subType"]) {
			var wsModel = t.wbModel.getWorksheetById(lockElem.Element["sheetId"]);
			if (wsModel) {
				var wsIndex = wsModel.getIndex();
				var sheetView = wsModel.getNamedSheetViewByName(lockElem.Element["rangeOrObjectId"]);
				if (sheetView) {
					sheetView.isLock = lockElem.UserId;
					this.handlers.trigger("asc_onRefreshNamedSheetViewList", wsIndex);
				}

				this.handlers.trigger("asc_onLockNamedSheetViewManager", wsIndex, true);
			}
		}
	};

	spreadsheet_api.prototype.asc_isNamedSheetViewLocked = function(index, name) {
		var ws = this.wbModel.getWorksheet(index);
		var sheetId = null;
		if (null === ws || undefined === ws) {
			sheetId = this.asc_getActiveWorksheetId();
		} else {
			sheetId = ws.getId();
		}

		var lockInfo = this.collaborativeEditing.getLockInfo(c_oAscLockTypeElem.Object, AscCommonExcel.c_oAscLockTypeElemSubType.NamedSheetView, sheetId, name);
		return (false !== this.collaborativeEditing.getLockIntersection(lockInfo, c_oAscLockTypes.kLockTypeOther, /*bCheckOnlyLockAll*/false));
	};

	spreadsheet_api.prototype.asc_setActiveNamedSheetView = function(namedSheetView, index) {
		if (index === undefined) {
			index = this.wbModel.getActive();
		}
		var ws = this.wbModel.getWorksheet(index);

		var oldActiveIndex = ws.nActiveNamedSheetView;
		for (var i = 0; i < ws.aNamedSheetViews.length; i++) {
			if (namedSheetView && namedSheetView === ws.aNamedSheetViews[i]) {
				ws.nActiveNamedSheetView = i;
				namedSheetView._isActive = true;
			} else {
				ws.aNamedSheetViews[i]._isActive = false;
			}
		}
		if (oldActiveIndex !== ws.nActiveNamedSheetView) {
			History.Create_NewPoint();
			History.StartTransaction();

			History.Add(AscCommonExcel.UndoRedoWoorksheet, AscCH.historyitem_Worksheet_SetActiveNamedSheetView,
				this.ws ? this.ws.getId() : null, null,
				new UndoRedoData_FromTo(oldActiveIndex, ws.nActiveNamedSheetView), true);

			History.EndTransaction();

			//TODO нужно переприменять все фильтра и в дальнейшем сортировку


		}
	};

	prot["asc_addNamedSheetView"] = prot.asc_addNamedSheetView;
	prot["asc_getNamedSheetViews"] = prot.asc_getNamedSheetViews;
	prot["asc_deleteNamedSheetViews"] = prot.asc_deleteNamedSheetViews;
	prot["asc_setActiveNamedSheetView"] = prot.asc_setActiveNamedSheetView;

})(window, window.document);